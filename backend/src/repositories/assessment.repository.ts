import { AssessmentModel } from '../models/assessment.model';
import { CandidateAssessmentModel } from '../models/candidate-assessment.model';

export const assessmentRepository = {
  create: (data: Record<string, any>) => AssessmentModel.create(data),
  findInWorkspace: (workspaceId: string, id: string) => AssessmentModel.findOne({ _id: id, workspaceId }),
  update: (id: string, patch: Record<string, any>) =>
    AssessmentModel.findByIdAndUpdate(id, patch, { new: true }),
  list: (workspaceId: string) => AssessmentModel.find({ workspaceId }).sort({ createdAt: -1 }).lean(),
};

export const candidateAssessmentRepository = {
  create: (data: Record<string, any>) => CandidateAssessmentModel.create(data),
  findByToken: (secureToken: string) => CandidateAssessmentModel.findOne({ secureToken }),
  findInWorkspace: (workspaceId: string, id: string) =>
    CandidateAssessmentModel.findOne({ _id: id, workspaceId }),
  update: (id: string, patch: Record<string, any>) =>
    CandidateAssessmentModel.findByIdAndUpdate(id, patch, { new: true }),
  listByApplication: (applicationId: string) =>
    CandidateAssessmentModel.find({ applicationId }).sort({ createdAt: -1 }).lean(),
  countByAssessment: (assessmentId: string) =>
    CandidateAssessmentModel.countDocuments({ assessmentId }),
};
