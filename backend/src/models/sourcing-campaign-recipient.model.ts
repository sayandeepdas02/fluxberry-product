import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { SOURCING_RECIPIENT_STATUSES } from '../shared';

/** Per-recipient send + tracking state within a campaign. */
const sourcingCampaignRecipientSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'SourcingCampaign', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'SourcedContact', required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    company: { type: String, default: null },
    title: { type: String, default: null },
    status: { type: String, enum: SOURCING_RECIPIENT_STATUSES, default: 'PENDING' },
    providerMessageId: { type: String, default: null },
    /** Public, unguessable token backing the one-click unsubscribe link. */
    unsubscribeToken: { type: String, required: true },
    sentAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true, collection: 'sourcing_campaign_recipients' },
);

sourcingCampaignRecipientSchema.index({ campaignId: 1, status: 1 });
sourcingCampaignRecipientSchema.index({ unsubscribeToken: 1 }, { unique: true });

export type SourcingCampaignRecipientDoc = InferSchemaType<typeof sourcingCampaignRecipientSchema>;
export const SourcingCampaignRecipientModel =
  (models.SourcingCampaignRecipient as Model<SourcingCampaignRecipientDoc>) ||
  model<SourcingCampaignRecipientDoc>('SourcingCampaignRecipient', sourcingCampaignRecipientSchema);
