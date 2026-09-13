import crypto from 'node:crypto';
import type { CreateReferralInput, UpdateReferralRewardInput, ReferralDto } from '@fluxberry/shared';
import { config } from '../config/env';
import { referralRepository } from '../repositories/referral.repository';
import { jobRepository } from '../repositories/job.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { JobModel } from '../models/job.model';
import { ApplicationModel } from '../models/application.model';
import { notFound, badRequest } from '../utils/errors';
import { auditService } from './audit.service';
import { isJobAccessible } from '../utils/job-access';
import type { AuthContext } from '../types/auth-context';

function isDup(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as any).code === 11000;
}

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

/**
 * Batched DTO builder: one job-title query and one application-status query
 * total, regardless of how many referral rows there are (rather than the
 * 1 + 3N round trips a naive per-row `.findById`/`.countDocuments` would do).
 */
async function toDtos(rows: any[]): Promise<ReferralDto[]> {
  if (!rows.length) return [];

  const jobIds = [...new Set(rows.map((r) => String(r.jobId)))];
  const applicationIds = [...new Set(rows.flatMap((r) => (r.applicationIds ?? []).map((id: any) => String(id))))];

  const [jobs, applications] = await Promise.all([
    JobModel.find({ _id: { $in: jobIds } }).select('title').lean(),
    applicationIds.length
      ? ApplicationModel.find({ _id: { $in: applicationIds } }).select('status').lean()
      : Promise.resolve([]),
  ]);
  const jobTitleById = new Map(jobs.map((j: any) => [String(j._id), j.title as string]));
  const applicationStatusById = new Map(applications.map((a: any) => [String(a._id), a.status as string]));

  return rows.map((r) => {
    // Filter through applicationStatusById (not just .length) so an
    // application id whose document no longer exists doesn't inflate the count.
    const appIds: string[] = (r.applicationIds ?? []).map((id: any) => String(id));
    const liveAppIds = appIds.filter((id) => applicationStatusById.has(id));
    return {
      id: String(r._id),
      workspaceId: String(r.workspaceId),
      referrerUserId: String(r.referrerUserId),
      referrerName: r.referrerName,
      referrerEmail: r.referrerEmail,
      code: r.code,
      shareUrl: `${config.publicAppUrl}/r/${r.code}`,
      jobId: String(r.jobId),
      jobTitle: jobTitleById.get(String(r.jobId)) ?? 'Unknown role',
      applicationCount: liveAppIds.length,
      hiredCount: liveAppIds.filter((id) => applicationStatusById.get(id) === 'HIRED').length,
      rewardStatus: r.rewardStatus,
      rewardNote: r.rewardNote ?? null,
      createdAt: new Date(r.createdAt).toISOString(),
    };
  });
}

async function toDto(r: any): Promise<ReferralDto> {
  const [dto] = await toDtos([r]);
  return dto;
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
    let created;
    try {
      created = await referralRepository.create({
        workspaceId: workspaceId as any,
        referrerUserId: user.id as any,
        referrerName: user.name,
        referrerEmail: user.email,
        jobId: input.jobId as any,
        code,
      });
    } catch (err) {
      // Two concurrent requests can both pass the findForUserAndJob check
      // above; the loser hits the {workspaceId, referrerUserId, jobId} unique
      // index. Recover by returning the winner's referral instead of erroring.
      if (isDup(err)) {
        const winner = await referralRepository.findForUserAndJob(workspaceId, user.id, input.jobId);
        if (winner) return toDto(winner);
      }
      throw err;
    }
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
    return toDtos(rows);
  },

  async listForWorkspace(workspaceId: string): Promise<ReferralDto[]> {
    const rows = await referralRepository.listForWorkspace(workspaceId);
    return toDtos(rows);
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
