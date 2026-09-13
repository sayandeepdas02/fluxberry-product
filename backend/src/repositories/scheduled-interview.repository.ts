import { ScheduledInterviewModel } from '../models/scheduled-interview.model';

export const scheduledInterviewRepository = {
  create: (data: Record<string, any>) => ScheduledInterviewModel.create(data),
  findById: (id: string) => ScheduledInterviewModel.findById(id),
  findInWorkspace: (workspaceId: string, id: string) =>
    ScheduledInterviewModel.findOne({ _id: id, workspaceId }),
  listByApplication: (applicationId: string) =>
    ScheduledInterviewModel.find({ applicationId }).sort({ start: 1 }).lean(),
  findByToken: (token: string) => ScheduledInterviewModel.findOne({ interviewerAccessToken: token }),
  delete: (id: string) => ScheduledInterviewModel.findByIdAndDelete(id),
};
