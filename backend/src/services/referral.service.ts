import crypto from 'node:crypto';
import type { CreateReferralInput, UpdateReferralRewardInput, ReferralDto } from '@fluxberry/shared';
import { config } from '../config/env';
import { referralRepository } from '../repositories/referral.repository';
import { jobRepository } from '../repositories/job.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { ApplicationModel } from '../models/application.model';
import { notFound, badRequest } from '../utils/errors';
import { auditService } from './audit.service';
import { isJobAccessible } from '../utils/job-access';
import type { AuthContext } from '../types/auth-context';

/** Unambiguous alphabet (no 0/O/1/I/L) — codes get read aloud/typed, not just clicked. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i += 1) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

async function uniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    if (!(await referralRepository.codeExists(code))) return code;
  }
  throw new Error('Could not generate a unique referral code — retry');
}

async function toDto(r: any): Promise<ReferralDto> {
  const job = await jobRepository.findById(String(r.jobId));
  const [applicationCount, hiredCount] = await Promise.all([
    ApplicationModel.countDocuments({ _id: { $in: r.applicationIds ?? [] } }),
    ApplicationModel.countDocuments({ _id: { $in: r.applicationIds ?? [] }, status: 'HIRED' }),
  ]);
  return {
    id: String(r._id),
    workspaceId: String(r.workspaceId),
    referrerUserId: String(r.referrerUserId),
    referrerName: r.referrerName,
    referrerEmail: r.referrerEmail,
    code: r.code,
    shareUrl: `${config.publicAppUrl}/r/${r.code}`,
    jobId: String(r.jobId),
    jobTitle: job?.title ?? 'Unknown role',
    applicationCount,
    hiredCount,
    rewardStatus: r.rewardStatus,
    rewardNote: r.rewardNote ?? null,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

export const referralService = {
  /** Get-or-create semantics: re-requesting a link for the same (member, job) returns the same code. */
  async getOrCreate(workspaceId: string, auth: AuthContext, input: CreateReferralInput): Promise<ReferralDto> {
    const user = auth.user;
    const job = await jobRepository.findInWorkspace(workspaceId, input.jobId);
    // A job restricted away from this member must be invisible, not merely
    // blocked — same 404-not-403 convention as requireJobAccess elsewhere.
    if (!job || !isJobAccessible(auth, job.restrictedTo)) throw notFound('Job not found');
    if (job.status !== 'PUBLISHED' && job.status !== 'PAUSED') {
      throw badRequest('Referral links can only be created for open roles');
    }

    const existing = await referralRepository.findForUserAndJob(workspaceId, user.id, input.jobId);
    if (existing) return toDto(existing);

    const code = await uniqueCode();
    const created = await referralRepository.create({
      workspaceId: workspaceId as any,
      referrerUserId: user.id as any,
      referrerName: user.name,
      referrerEmail: user.email,
      jobId: input.jobId as any,
      code,
    });
    await auditService.log({
      workspaceId,
      userId: user.id,
      action: 'referral.created',
      resourceType: 'referral',
      resourceId: String(created._id),
      metadata: { jobId: input.jobId },
    });
    return toDto(created);
  },

  async listMine(workspaceId: string, userId: string): Promise<ReferralDto[]> {
    const rows = await referralRepository.listForUser(workspaceId, userId);
    return Promise.all(rows.map(toDto));
  },

  async listForWorkspace(workspaceId: string): Promise<ReferralDto[]> {
    const rows = await referralRepository.listForWorkspace(workspaceId);
    return Promise.all(rows.map(toDto));
  },

  async updateReward(
    workspaceId: string,
    adminUserId: string,
    referralId: string,
    input: UpdateReferralRewardInput,
  ): Promise<ReferralDto> {
    const existing = await referralRepository.findInWorkspace(workspaceId, referralId);
    if (!existing) throw notFound('Referral not found');
    const updated = await referralRepository.updateReward(referralId, {
      rewardStatus: input.rewardStatus,
      rewardNote: input.rewardNote ?? null,
    });
    await auditService.log({
      workspaceId,
      userId: adminUserId,
      action: 'referral.reward_updated',
      resourceType: 'referral',
      resourceId: referralId,
      metadata: { rewardStatus: input.rewardStatus },
    });
    return toDto(updated!);
  },

  /** Resolves a public referral link to its destination — used by the frontend's /r/[code] redirect page. */
  async resolvePublic(code: string): Promise<{ workspaceSlug: string; jobSlug: string }> {
    const referral = await referralRepository.findByCode(code);
    if (!referral) throw notFound('Referral link not found');
    const [job, workspace] = await Promise.all([
      jobRepository.findById(String(referral.jobId)),
      workspaceRepository.findById(String(referral.workspaceId)),
    ]);
    if (!job || !workspace) throw notFound('Referral link not found');
    return { workspaceSlug: workspace.slug, jobSlug: job.slug };
  },

  /**
   * Attribution, called from application.service on public apply. Only a code
   * that resolves to a Referral for *this exact job* counts — a stray or
   * stale `?ref=` never lets the client fabricate reward-eligible credit.
   * Returns the referral id to record against once the application exists,
   * or null (never blocks the candidate's application either way).
   */
  async resolveForAttribution(code: string | undefined, jobId: string): Promise<string | null> {
    if (!code) return null;
    const referral = await referralRepository.findByCode(code);
    if (!referral || String(referral.jobId) !== jobId) return null;
    return String(referral._id);
  },

  async recordApplication(referralId: string, applicationId: string): Promise<void> {
    await referralRepository.addApplication(referralId, applicationId);
  },
};
