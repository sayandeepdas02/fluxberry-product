import { ApplicationModel, type ApplicationDoc } from '../models/application.model';
import { ApplicationAnswersModel } from '../models/application-answers.model';

export const applicationRepository = {
  create: (data: Record<string, any>) => ApplicationModel.create(data),
  findById: (id: string) => ApplicationModel.findById(id),
  findInWorkspace: (workspaceId: string, id: string) =>
    ApplicationModel.findOne({ _id: id, workspaceId }),
  findByJobAndCandidate: (jobId: string, candidateId: string) =>
    ApplicationModel.findOne({ jobId, candidateId }),
  update: (id: string, patch: Record<string, any>) =>
    ApplicationModel.findByIdAndUpdate(id, patch, { new: true }),
  listByCandidate: (candidateId: string) =>
    ApplicationModel.find({ candidateId }).sort({ appliedAt: -1 }).lean(),
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
