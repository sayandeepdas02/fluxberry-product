import { WorkspaceModel, type WorkspaceDoc } from '../models/workspace.model';

export const workspaceRepository = {
  create: (data: Partial<WorkspaceDoc>) => WorkspaceModel.create(data),
  findById: (id: string) => WorkspaceModel.findById(id),
  findBySlug: (slug: string) => WorkspaceModel.findOne({ slug }),
  slugExists: async (slug: string) => (await WorkspaceModel.exists({ slug })) != null,
  update: (id: string, patch: Partial<WorkspaceDoc>) =>
    WorkspaceModel.findByIdAndUpdate(id, patch, { new: true }),
  findByIds: (ids: string[]) => WorkspaceModel.find({ _id: { $in: ids } }).lean(),

  findByCareersSlug: (careersSlug: string) => WorkspaceModel.findOne({ careersSlug }),
  careersSlugTaken: async (careersSlug: string, exceptId: string) => {
    const existing = await WorkspaceModel.findOne({ careersSlug }).select('_id').lean();
    return existing != null && String(existing._id) !== exceptId;
  },
  setCareersSlug: (id: string, careersSlug: string) =>
    WorkspaceModel.findByIdAndUpdate(id, { careersSlug }, { new: true }),

  findByClerkOrgId: (clerkOrgId: string) => WorkspaceModel.findOne({ clerkOrgId }),
};
