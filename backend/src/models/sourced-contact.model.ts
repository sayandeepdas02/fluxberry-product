import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { SOURCING_PROVIDERS } from '../shared';

const experienceSchema = new Schema(
  {
    title: { type: String, default: null },
    company: { type: String, default: null },
    start: { type: String, default: null },
    end: { type: String, default: null },
  },
  { _id: false },
);

const educationSchema = new Schema(
  {
    degree: { type: String, default: null },
    school: { type: String, default: null },
    major: { type: String, default: null },
  },
  { _id: false },
);

const addedToJobSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    jobTitle: { type: String, default: null },
  },
  { _id: false },
);

/**
 * A person surfaced by a sourcing search, cached durably and workspace-scoped so
 * that viewing, listing, exporting, or emailing them never re-hits the (paid)
 * People Data Labs API. Deduped per workspace by upstream `pdlId`.
 *
 * `matchScore`/`matchReasons` are the score against the search that most recently
 * surfaced this contact; a specific search re-scores against its own criteria at
 * read time, so a contact shared across searches stays correct.
 */
const sourcedContactSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    provider: { type: String, enum: SOURCING_PROVIDERS, default: 'MOCK' },
    /** Stable upstream id (PDL person id); null for manually added contacts. */
    pdlId: { type: String, default: null },
    fullName: { type: String, required: true, trim: true },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    title: { type: String, default: null },
    seniority: { type: String, default: null },
    company: { type: String, default: null },
    companySize: { type: String, default: null },
    industry: { type: String, default: null },
    location: { type: String, default: null },
    country: { type: String, default: null },
    yearsExperience: { type: Number, default: null },
    skills: { type: [String], default: [] },
    linkedinUrl: { type: String, default: null },
    githubUrl: { type: String, default: null },
    workEmail: { type: String, default: null },
    personalEmail: { type: String, default: null },
    phone: { type: String, default: null },
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    /** The full provider payload, kept for later enrichment without a re-fetch. */
    rawProfile: { type: Schema.Types.Mixed, default: null },
    /**
     * When a PDL backfill was last attempted for this contact (set whether it
     * found data, found nothing, or errored) — so a contact with a permanent
     * gap (e.g. genuinely no GitHub/personal email anywhere) isn't re-billed
     * $0.30 on every subsequent detail-view open. See hasEnrichmentGap.
     */
    backfillAttemptedAt: { type: Date, default: null },
    /** Set once the workspace paid (COMPENSATION_LOOKUP) to see this contact's market band; later views are free. */
    compensationUnlockedAt: { type: Date, default: null },
    matchScore: { type: Number, default: 0 },
    matchReasons: { type: [String], default: [] },
    /** Set once the contact has been converted into a Candidate + Application. */
    addedToJob: { type: addedToJobSchema, default: null },
  },
  { timestamps: true, collection: 'sourced_contacts' },
);

// Dedupe by upstream id within a workspace. Partial (not sparse) so manually
// added contacts with a null pdlId never collide with each other.
sourcedContactSchema.index(
  { workspaceId: 1, pdlId: 1 },
  { unique: true, partialFilterExpression: { pdlId: { $type: 'string' } } },
);
sourcedContactSchema.index({ workspaceId: 1, createdAt: -1 });

export type SourcedContactDoc = InferSchemaType<typeof sourcedContactSchema>;
export const SourcedContactModel =
  (models.SourcedContact as Model<SourcedContactDoc>) ||
  model<SourcedContactDoc>('SourcedContact', sourcedContactSchema);
