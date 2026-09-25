import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { SOURCING_CAMPAIGN_STATUSES } from '../shared';

const statsSchema = new Schema(
  {
    recipients: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    replied: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { _id: false },
);

/** A single-shot outreach campaign to a talent pool (list). */
const sourcingCampaignSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true },
    listId: { type: Schema.Types.ObjectId, ref: 'SourcingList', required: true },
    subject: { type: String, required: true },
    /** Body with {{mergeTag}} tokens and optional {a|b} spintax; plain text/markdown. */
    body: { type: String, required: true },
    fromName: { type: String, default: null },
    replyToEmail: { type: String, default: null },
    status: { type: String, enum: SOURCING_CAMPAIGN_STATUSES, default: 'DRAFT' },
    scheduledAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    stats: { type: statsSchema, default: () => ({}) },
  },
  { timestamps: true, collection: 'sourcing_campaigns' },
);

sourcingCampaignSchema.index({ workspaceId: 1, status: 1 });
sourcingCampaignSchema.index({ workspaceId: 1, createdAt: -1 });

export type SourcingCampaignDoc = InferSchemaType<typeof sourcingCampaignSchema>;
export const SourcingCampaignModel =
  (models.SourcingCampaign as Model<SourcingCampaignDoc>) ||
  model<SourcingCampaignDoc>('SourcingCampaign', sourcingCampaignSchema);
