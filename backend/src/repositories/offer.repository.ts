import { OfferModel } from '../models/offer.model';

export const offerRepository = {
  create: (data: Record<string, any>) => OfferModel.create(data),
  findById: (id: string) => OfferModel.findById(id),
  findInWorkspace: (workspaceId: string, id: string) => OfferModel.findOne({ _id: id, workspaceId }),
  findByToken: (token: string) => OfferModel.findOne({ token }),
  findByApplication: (applicationId: string) =>
    OfferModel.find({ applicationId }).sort({ createdAt: -1 }),
  update: (id: string, patch: Record<string, any>) =>
    OfferModel.findByIdAndUpdate(id, patch, { new: true }),
  updateWithCondition: (id: string, patch: Record<string, any>, condition: Record<string, any>) =>
    OfferModel.findOneAndUpdate({ _id: id, ...condition }, patch, { new: true }),
};
