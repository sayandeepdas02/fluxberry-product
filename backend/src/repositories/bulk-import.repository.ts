import { BulkImportModel } from '../models/bulk-import.model';

export const bulkImportRepository = {
  create: (data: Record<string, any>) => BulkImportModel.create(data),
  findById: (id: string) => BulkImportModel.findById(id),
  findInWorkspace: (workspaceId: string, id: string) => BulkImportModel.findOne({ _id: id, workspaceId }),
  findByWorkspace: (workspaceId: string) => BulkImportModel.find({ workspaceId }).sort({ createdAt: -1 }),
  update: (id: string, patch: Record<string, any>) =>
    BulkImportModel.findByIdAndUpdate(id, patch, { new: true }),
};
