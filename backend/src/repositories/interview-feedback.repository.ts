import { InterviewFeedbackModel } from '../models/interview-feedback.model';

export const interviewFeedbackRepository = {
  create: (data: Record<string, any>) => InterviewFeedbackModel.create(data),
  listByApplication: (applicationId: string) =>
    InterviewFeedbackModel.find({ applicationId }).sort({ createdAt: -1 }).lean(),
};
