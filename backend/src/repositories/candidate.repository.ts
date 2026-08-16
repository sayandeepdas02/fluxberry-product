import { CandidateModel, type CandidateDoc } from '../models/candidate.model';

export const candidateRepository = {
  create: (data: Record<string, any>) => CandidateModel.create(data),
  findById: (id: string) => CandidateModel.findById(id),
  findInWorkspace: (workspaceId: string, id: string) =>
    CandidateModel.findOne({ _id: id, workspaceId }),
  findByEmail: (workspaceId: string, email: string) =>
    CandidateModel.findOne({ workspaceId, email: email.toLowerCase().trim() }),
  update: (id: string, patch: Record<string, any>) =>
    CandidateModel.findByIdAndUpdate(id, patch, { new: true }),
};
