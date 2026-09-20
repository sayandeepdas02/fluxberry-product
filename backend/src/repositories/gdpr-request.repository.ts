import { GdprRequestModel, type GdprRequestDoc } from '../models/gdpr-request.model';

export const gdprRequestRepository = {
  create: (data: Partial<GdprRequestDoc>) => GdprRequestModel.create(data),

  findById: (id: string) => GdprRequestModel.findById(id),

  findByWorkspace: async (workspaceId: string, { page = 1, limit = 20 } = {}) => {
    const [items, total] = await Promise.all([
      GdprRequestModel.find({ workspaceId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      GdprRequestModel.countDocuments({ workspaceId }),
    ]);
    return { items, total, page, limit };
  },

  update: (id: string, patch: Partial<GdprRequestDoc>) =>
    GdprRequestModel.findByIdAndUpdate(id, patch, { new: true }),
};
