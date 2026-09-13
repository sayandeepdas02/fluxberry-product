import { MessageModel, type MessageDoc } from '../models/message.model';

export const messageRepository = {
  create: (data: Partial<MessageDoc>) => MessageModel.create(data),
  listByApplication: (applicationId: string) =>
    MessageModel.find({ applicationId }).sort({ createdAt: 1 }).lean(),
  findByProviderMessageId: (providerMessageId: string) =>
    MessageModel.findOne({ providerMessageId }).lean(),
  markThreadRead: (applicationId: string) =>
    MessageModel.updateMany({ applicationId, direction: 'inbound' }, { readByRecruiter: true }),
};
