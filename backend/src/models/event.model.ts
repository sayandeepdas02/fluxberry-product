import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { EVENT_TYPES } from '@fluxberry/shared';

/**
 * Persisted domain events — the source of truth for the candidate timeline
 * (spec §34) and analytics aggregation (spec §56).
 */
const eventSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', default: null },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', default: null },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorLabel: { type: String, default: 'system' },
    payload: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: 'events' },
);

eventSchema.index({ workspaceId: 1, createdAt: -1 });
eventSchema.index({ applicationId: 1, createdAt: 1 });
eventSchema.index({ candidateId: 1, createdAt: 1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const EventModel =
  (models.Event as Model<EventDoc>) || model<EventDoc>('Event', eventSchema);
