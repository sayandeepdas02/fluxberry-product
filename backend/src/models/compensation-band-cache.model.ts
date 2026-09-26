import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';

/**
 * Global (NOT workspace-scoped) cache of a Levels.fyi compensation band —
 * keyed by company + role, not by individual candidate, since market comp
 * data is shared across every candidate at that company/level and barely
 * changes day to day. A cached `band: null` doc means a prior lookup couldn't
 * resolve this company/role — re-checked only after `fetchedAt` goes stale,
 * so an unresolvable company doesn't get re-paid for on every candidate.
 */
const compensationBandCacheSchema = new Schema(
  {
    companyKey: { type: String, required: true, trim: true, lowercase: true },
    titleKey: { type: String, default: null, trim: true, lowercase: true },
    /** Levels.fyi returns a different band/currency per location — must be part of the cache identity, not just company+title. */
    locationKey: { type: String, default: null, trim: true, lowercase: true },
    band: { type: Schema.Types.Mixed, default: null },
    fetchedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'compensation_band_cache' },
);

compensationBandCacheSchema.index({ companyKey: 1, titleKey: 1, locationKey: 1 }, { unique: true });

export type CompensationBandCacheDoc = InferSchemaType<typeof compensationBandCacheSchema>;
export const CompensationBandCacheModel =
  (models.CompensationBandCache as Model<CompensationBandCacheDoc>) ||
  model<CompensationBandCacheDoc>('CompensationBandCache', compensationBandCacheSchema);

export const COMPENSATION_BAND_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
