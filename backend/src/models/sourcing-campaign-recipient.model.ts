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
    /**
     * Funnel timestamps, set once and never cleared so aggregate stats stay
     * monotonic even after a later status change (e.g. an unsubscribe must not
     * lower the sent/opened/replied counts).
     */
    /** When the fan-out queued this recipient's send (counted against that UTC day's cap); null = not yet queued. */
    dispatchedAt: { type: Date, default: null },
    /** Which fan-out run claimed this recipient (with its cap reservation) — makes dispatch retry-safe. */
    dispatchToken: { type: String, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    openedAt: { type: Date, default: null },
    repliedAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true, collection: 'sourcing_campaign_recipients' },
);

sourcingCampaignRecipientSchema.index({ campaignId: 1, status: 1 });
sourcingCampaignRecipientSchema.index({ unsubscribeToken: 1 }, { unique: true });
// Delivery-event webhooks look recipients up by providerMessageId on every event.
sourcingCampaignRecipientSchema.index(
  { providerMessageId: 1 },
  { partialFilterExpression: { providerMessageId: { $type: 'string' } } },
);

export type SourcingCampaignRecipientDoc = InferSchemaType<typeof sourcingCampaignRecipientSchema>;
export const SourcingCampaignRecipientModel =
  (models.SourcingCampaignRecipient as Model<SourcingCampaignRecipientDoc>) ||
  model<SourcingCampaignRecipientDoc>('SourcingCampaignRecipient', sourcingCampaignRecipientSchema);
