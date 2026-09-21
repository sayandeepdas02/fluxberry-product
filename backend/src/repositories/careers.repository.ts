import { CareersPageModel } from '../models/careers-page.model';
import { JobModel } from '../models/job.model';

export const careersRepository = {
  findByWorkspace: (workspaceId: string) => CareersPageModel.findOne({ workspaceId }),
  create: (data: Record<string, any>) => CareersPageModel.create(data),
  update: (workspaceId: string, patch: Record<string, any>) =>
    CareersPageModel.findOneAndUpdate({ workspaceId }, { $set: patch }, { new: true }),
  publishedJobs: (workspaceId: string) =>
    JobModel.find({ workspaceId, status: 'PUBLISHED' }).sort({ publishedAt: -1 }).lean(),

  /** Every published careers page across every workspace — used to build the public sitemap. */
  publishedPages: () => CareersPageModel.find({ published: true }).select('workspaceId updatedAt').lean(),
};
