import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { SOURCING_SEARCH_STATUSES } from '../shared';

/**
 * One executed natural-language search: the prompt, the AI-parsed (and
 * recruiter-editable) criteria, the paged cache state, and the ordered set of
 * contacts it surfaced. Credit spend is tracked here so it's always visible.
 */
const sourcingSearchSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    prompt: { type: String, required: true, trim: true },
    /** Structured criteria (AI output or edited chips); flexible shape. */
    criteria: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: SOURCING_SEARCH_STATUSES, default: 'DRAFT' },
    /** Total matches available upstream (may exceed what we've fetched). */
    total: { type: Number, default: 0 },
    /** How many profiles we've actually retrieved + cached for this search. */
    fetched: { type: Number, default: 0 },
    /** Search credits spent so far on this search. */
    creditsUsed: { type: Number, default: 0 },
    /** Opaque provider pagination cursor for the next "load more" page. */
    scrollToken: { type: String, default: null },
    /** Ordered contact ids surfaced by this search (best fit first, capped). */
    contactIds: { type: [Schema.Types.ObjectId], ref: 'SourcedContact', default: [] },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'sourcing_searches' },
);

sourcingSearchSchema.index({ workspaceId: 1, createdAt: -1 });

export type SourcingSearchDoc = InferSchemaType<typeof sourcingSearchSchema>;
export const SourcingSearchModel =
  (models.SourcingSearch as Model<SourcingSearchDoc>) ||
  model<SourcingSearchDoc>('SourcingSearch', sourcingSearchSchema);
