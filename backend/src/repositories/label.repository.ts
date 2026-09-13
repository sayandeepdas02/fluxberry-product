import { LabelModel, type LabelDoc } from '../models/label.model';

export const labelRepository = {
  create: (data: Partial<LabelDoc>) => LabelModel.create(data),
  findById: (id: string) => LabelModel.findById(id),
  findInWorkspace: (workspaceId: string, id: string) => LabelModel.findOne({ _id: id, workspaceId }),
  list: (workspaceId: string) => LabelModel.find({ workspaceId }).sort({ name: 1 }).lean(),
  findByIds: (ids: string[]) => LabelModel.find({ _id: { $in: ids } }).lean(),
  existsByName: async (workspaceId: string, name: string, exceptId?: string) => {
    const q: Record<string, unknown> = { workspaceId, name: new RegExp(`^${escapeRegex(name)}$`, 'i') };
    if (exceptId) q._id = { $ne: exceptId };
    return (await LabelModel.exists(q)) != null;
  },
  update: (id: string, patch: Partial<LabelDoc>) => LabelModel.findByIdAndUpdate(id, patch, { new: true }),
  remove: (id: string) => LabelModel.findByIdAndDelete(id),
  countByWorkspace: (workspaceId: string) => LabelModel.countDocuments({ workspaceId }),
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
