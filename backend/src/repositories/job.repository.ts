import type { FilterQuery } from 'mongoose';
import { JobModel, type JobDoc } from '../models/job.model';
import type { AuthContext } from '../types/auth-context';
import { applyJobAccessFilter } from '../utils/job-access';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface JobListFilter {
  status: 'all' | 'active' | 'draft' | 'closed';
  search?: string;
}

export const jobRepository = {
  create: (data: Record<string, any>) => JobModel.create(data),

  findById: (id: string) => JobModel.findById(id),

  findInWorkspace: (workspaceId: string, id: string) =>
    JobModel.findOne({ _id: id, workspaceId }),

  findBySlug: (workspaceId: string, slug: string) => JobModel.findOne({ workspaceId, slug }),

  findByTitle: (workspaceId: string, title: string) => JobModel.findOne({ workspaceId, title }).lean(),

  slugExists: async (workspaceId: string, slug: string) =>
    (await JobModel.exists({ workspaceId, slug })) != null,

  list: (workspaceId: string, filter: JobListFilter, auth: AuthContext) => {
    let q: FilterQuery<JobDoc> = { workspaceId };
    if (filter.status === 'active') q.status = { $in: ['PUBLISHED', 'PAUSED'] };
    else if (filter.status === 'draft') q.status = 'DRAFT';
    else if (filter.status === 'closed') q.status = { $in: ['CLOSED', 'ARCHIVED'] };
    else q.status = { $ne: 'ARCHIVED' };
    if (filter.search) q.title = { $regex: escapeRegex(filter.search), $options: 'i' };
    q = applyJobAccessFilter(q, auth, 'restrictedTo');
    return JobModel.find(q).sort({ createdAt: -1 }).lean();
  },

  update: (id: string, patch: Record<string, any>) =>
    JobModel.findByIdAndUpdate(id, patch, { new: true }),
};
