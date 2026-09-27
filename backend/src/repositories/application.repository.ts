import { ApplicationModel, type ApplicationDoc } from '../models/application.model';
import { ApplicationAnswersModel } from '../models/application-answers.model';

export const applicationRepository = {
  create: (data: Record<string, any>) => ApplicationModel.create(data),
  findById: (id: string) => ApplicationModel.findById(id),
  findInWorkspace: (workspaceId: string, id: string) =>
    ApplicationModel.findOne({ _id: id, workspaceId }).populate('labelIds'),
  findByJobAndCandidate: (jobId: string, candidateId: string) =>
    ApplicationModel.findOne({ jobId, candidateId }),
  update: (id: string, patch: Record<string, any>) =>
    ApplicationModel.findByIdAndUpdate(id, patch, { new: true }).populate('labelIds'),
  listByCandidate: (candidateId: string) =>
    ApplicationModel.find({ candidateId }).sort({ appliedAt: -1 }).lean(),
  /**
   * Atomically take the right to bill this application's AI screening: succeeds
   * for exactly one concurrent caller while it's unbilled and not already
   * claimed (a claim older than `staleMs` — a crashed caller — can be retaken).
   */
  claimScreeningBilling: (applicationId: string, staleMs = 5 * 60_000) =>
    ApplicationModel.findOneAndUpdate(
      {
        _id: applicationId,
        screeningBilledVia: null,
        $or: [{ screeningClaimAt: null }, { screeningClaimAt: { $lt: new Date(Date.now() - staleMs) } }],
      },
      { $set: { screeningClaimAt: new Date() } },
      { new: true },
    ).lean(),
  /**
   * Atomically move a finished screening (COMPLETED/FAILED) back to PENDING for a
   * re-screen. Returns the application as it was before, or null when a run is
   * already queued/in flight (or it's awaiting credits) — so only one caller wins.
   */
  claimRescreen: (applicationId: string) =>
    ApplicationModel.findOneAndUpdate(
      { _id: applicationId, 'screeningResult.status': { $in: ['COMPLETED', 'FAILED'] } },
      { $set: { 'screeningResult.status': 'PENDING' } },
      { new: false },
    ).lean(),
  countAwaitingScreening: (workspaceId: string, jobId: string) =>
    ApplicationModel.countDocuments({ workspaceId, jobId, 'screeningResult.status': 'AWAITING_CREDITS' }),
  /** Oldest first, so applicants are screened in the order they applied. */
  listAwaitingScreening: (workspaceId: string, jobId: string, limit: number) =>
    ApplicationModel.find({ workspaceId, jobId, 'screeningResult.status': 'AWAITING_CREDITS' })
      .sort({ appliedAt: 1 })
      .limit(limit)
      .lean(),
  countByJobAndStage: (jobId: string, stage: string) =>
    ApplicationModel.countDocuments({ jobId, stage }),
};

export const answersRepository = {
  upsert: (applicationId: string, answers: unknown[]) =>
    ApplicationAnswersModel.findOneAndUpdate(
      { applicationId },
      { answers },
      { new: true, upsert: true },
    ),
  findByApplication: (applicationId: string) =>
    ApplicationAnswersModel.findOne({ applicationId }).lean(),
};
