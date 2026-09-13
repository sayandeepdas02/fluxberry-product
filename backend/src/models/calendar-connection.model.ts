import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { CALENDAR_PROVIDERS } from '@fluxberry/shared';

/** One recruiter's connected calendar (Settings > Integrations, spec: interview scheduling). */
const calendarConnectionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: CALENDAR_PROVIDERS, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    connectedEmail: { type: String, default: null },
  },
  { timestamps: true, collection: 'calendar_connections' },
);

// One connection per user, regardless of provider — see calendar-connection.repository.ts.
calendarConnectionSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export type CalendarConnectionDoc = InferSchemaType<typeof calendarConnectionSchema>;
export const CalendarConnectionModel =
  (models.CalendarConnection as Model<CalendarConnectionDoc>) ||
  model<CalendarConnectionDoc>('CalendarConnection', calendarConnectionSchema);
