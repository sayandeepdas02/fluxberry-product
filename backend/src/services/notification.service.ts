import { Types } from 'mongoose';
import { NotificationModel } from '../models/notification.model';
import { WorkspaceMemberModel } from '../models/workspace-member.model';

export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
};

function toDto(n: any): NotificationDto {
  return {
    id: String(n._id),
    type: n.type,
    title: n.title,
    body: n.body ?? '',
    entityType: n.entityType ?? null,
    entityId: n.entityId ? String(n.entityId) : null,
    read: n.read,
    createdAt: new Date(n.createdAt).toISOString(),
  };
}

export const notificationService = {
  /** Fan out a notification to all admin/recruiter/owner members of a workspace. */
  async broadcast(workspaceId: string, notification: {
    type: string;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
  }) {
    const members = await WorkspaceMemberModel
      .find({ workspaceId: new Types.ObjectId(workspaceId), role: { $in: ['owner', 'admin', 'recruiter'] } })
      .select('userId')
      .lean();

    if (!members.length) return;

    const docs = members.map((m) => ({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: m.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body ?? '',
      entityType: notification.entityType ?? null,
      entityId: notification.entityId ? new Types.ObjectId(notification.entityId) : null,
      read: false,
    }));

    await NotificationModel.insertMany(docs, { ordered: false });
  },

  async list(workspaceId: string, userId: string, limit = 30): Promise<{ items: NotificationDto[]; unread: number }> {
    const [items, unread] = await Promise.all([
      NotificationModel
        .find({ workspaceId: new Types.ObjectId(workspaceId), userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments({
        workspaceId: new Types.ObjectId(workspaceId),
        userId: new Types.ObjectId(userId),
        read: false,
      }),
    ]);
    return { items: items.map(toDto), unread };
  },

  async markRead(workspaceId: string, userId: string, notificationId: string) {
    await NotificationModel.updateOne(
      { _id: notificationId, workspaceId: new Types.ObjectId(workspaceId), userId: new Types.ObjectId(userId) },
      { read: true },
    );
  },

  async markAllRead(workspaceId: string, userId: string) {
    await NotificationModel.updateMany(
      { workspaceId: new Types.ObjectId(workspaceId), userId: new Types.ObjectId(userId), read: false },
      { read: true },
    );
  },
};
