import { z } from 'zod';
import { objectIdSchema } from '../common';
import {
  SENIORITY_LEVELS,
  SOURCING_SEARCH_STATUSES,
  SOURCING_CAMPAIGN_STATUSES,
  SOURCING_RECIPIENT_STATUSES,
} from '../enums';

/**
 * Talent Sourcing contracts.
 *
 * A recruiter types a natural-language prompt ("Senior Rust engineer, 4+ yrs,
 * Bangalore"); the AI turns it into `SourcingCriteria`; the People Data Labs
 * provider turns that into a search; matched people are cached as
 * `SourcedContact`s, scored transparently against the criteria, grouped into
 * lists, and emailed via campaigns. Every shape below is shared by the API and
 * the web app (mirror kept in `frontend/lib/shared`).
 */

// ---------------------------------------------------------------------------
// Criteria — the structured filter set (AI output AND the recruiter-editable
// filter chips are the same shape, so an edit round-trips cleanly).
// ---------------------------------------------------------------------------

export const sourcingCriteriaSchema = z.object({
  /** Job titles / roles, e.g. ["Software Engineer", "Backend Engineer"]. */
  titles: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  /** Seniority buckets implied by the prompt (maps to PDL job_title_levels). */
  seniority: z.array(z.enum(SENIORITY_LEVELS)).max(10).default([]),
  /** Skills / technologies, e.g. ["Rust", "Tokio"]. */
  skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  /** Minimum years of professional experience. */
  minYears: z.number().int().min(0).max(60).optional(),
  /** Maximum years of professional experience. */
  maxYears: z.number().int().min(0).max(60).optional(),
  /** Free-text locations, e.g. ["Bangalore", "Bengaluru"]. */
  locations: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  /** ISO-ish country names, e.g. ["india"]. */
  countries: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  /** Current employers to target, e.g. ["Stripe"]. */
  companies: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  /** Employers to exclude. */
  excludeCompanies: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  /** Industries, e.g. ["computer software"]. */
  industries: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  /** Extra free-text keywords the structured fields didn't capture. */
  keywords: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});
export type SourcingCriteria = z.infer<typeof sourcingCriteriaSchema>;

/** An empty criteria object (used as a safe default before parsing). */
export function emptySourcingCriteria(): SourcingCriteria {
  return {
    titles: [],
    seniority: [],
    skills: [],
    locations: [],
    countries: [],
    companies: [],
    excludeCompanies: [],
    industries: [],
    keywords: [],
  };
}

// ---------------------------------------------------------------------------
// Search input
// ---------------------------------------------------------------------------

/** How many profiles a single page of a search retrieves (each costs credits). */
export const SOURCING_PAGE_SIZE = 25;
export const SOURCING_MAX_PAGE_SIZE = 100;

export const sourcingSearchInputSchema = z.object({
  prompt: z.string().trim().min(3, 'Describe who you are looking for').max(500),
  /** Optional page size override (bounded to control credit spend). */
  size: z.coerce.number().int().min(1).max(SOURCING_MAX_PAGE_SIZE).optional(),
});
export type SourcingSearchInput = z.infer<typeof sourcingSearchInputSchema>;

/** Re-run a saved search after the recruiter tweaks the parsed criteria chips. */
export const updateSearchCriteriaSchema = z.object({
  criteria: sourcingCriteriaSchema,
});
export type UpdateSearchCriteriaInput = z.infer<typeof updateSearchCriteriaSchema>;

export const loadMoreSchema = z.object({
  size: z.coerce.number().int().min(1).max(SOURCING_MAX_PAGE_SIZE).optional(),
});
export type LoadMoreInput = z.infer<typeof loadMoreSchema>;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export type SourcedContactExperience = {
  title?: string;
  company?: string;
  start?: string;
  end?: string;
};

export type SourcedContactEducation = {
  degree?: string;
  school?: string;
  major?: string;
};

export type SourcedContactDto = {
  id: string;
  workspaceId: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  seniority?: string | null;
  company?: string | null;
  companySize?: string | null;
  industry?: string | null;
  location?: string | null;
  country?: string | null;
  yearsExperience?: number | null;
  skills: string[];
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  /** Email is only revealed on the profile detail / export, never in list rows. */
  workEmail?: string | null;
  personalEmail?: string | null;
  /** Contactability signal for list views without leaking the address itself. */
  hasEmail: boolean;
  phone?: string | null;
  experience: SourcedContactExperience[];
  education: SourcedContactEducation[];
  /** Transparent 0-100 fit score computed against the search criteria. */
  matchScore: number;
  /** Plain-language reasons the contact matched (e.g. "Matches 4/5 skills"). */
  matchReasons: string[];
  source: string;
  provider: string;
  pdlId?: string | null;
  /** Set once the contact has been pushed into a job as a candidate. */
  addedToJob?: { applicationId: string; jobId: string; jobTitle?: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type SourcingSearchDto = {
  id: string;
  workspaceId: string;
  prompt: string;
  criteria: SourcingCriteria;
  status: (typeof SOURCING_SEARCH_STATUSES)[number];
  /** Total matches available upstream (may exceed what we've fetched). */
  total: number;
  /** How many profiles we've actually retrieved + cached for this search. */
  fetched: number;
  /** Search credits spent so far on this search. */
  creditsUsed: number;
  canLoadMore: boolean;
  createdBy?: string | null;
  createdAt: string;
  lastRunAt?: string | null;
};

export type SourcingSearchResultDto = {
  search: SourcingSearchDto;
  contacts: SourcedContactDto[];
};

// ---- Lists (talent pools) -------------------------------------------------

export const createListSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z.string().trim().max(500).optional(),
  contactIds: z.array(objectIdSchema).max(500).default([]),
});
export type CreateListInput = z.infer<typeof createListSchema>;

export const updateListSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional(),
});
export type UpdateListInput = z.infer<typeof updateListSchema>;

export const addToListSchema = z.object({
  contactIds: z.array(objectIdSchema).min(1).max(500),
});
export type AddToListInput = z.infer<typeof addToListSchema>;

export type SourcingListDto = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  contactCount: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---- Export + convert-to-candidate ---------------------------------------

export const exportContactsSchema = z.object({
  contactIds: z.array(objectIdSchema).min(1).max(1000),
});
export type ExportContactsInput = z.infer<typeof exportContactsSchema>;

export const convertContactSchema = z.object({
  jobId: objectIdSchema,
});
export type ConvertContactInput = z.infer<typeof convertContactSchema>;

// ---- Campaigns ------------------------------------------------------------

/** Merge tokens a campaign body/subject may reference. */
export const CAMPAIGN_MERGE_TAGS = [
  'firstName',
  'lastName',
  'fullName',
  'title',
  'company',
  'location',
] as const;
export type CampaignMergeTag = (typeof CAMPAIGN_MERGE_TAGS)[number];

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  listId: objectIdSchema,
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  /** Plain-text/markdown body, may contain {{firstName}}-style merge tags. */
  body: z.string().trim().min(1, 'Body is required').max(10000),
  fromName: z.string().trim().max(80).optional(),
  replyToEmail: z.string().trim().email().max(200).optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial().omit({ listId: true });
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const sendCampaignSchema = z.object({
  /** ISO timestamp to schedule for; omitted means send now. */
  scheduledAt: z.string().datetime().optional(),
});
export type SendCampaignInput = z.infer<typeof sendCampaignSchema>;

export const testCampaignSchema = z.object({
  toEmail: z.string().trim().email(),
});
export type TestCampaignInput = z.infer<typeof testCampaignSchema>;

export type SourcingCampaignStatsDto = {
  recipients: number;
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  failed: number;
};

export type SourcingCampaignDto = {
  id: string;
  workspaceId: string;
  name: string;
  listId: string;
  listName?: string | null;
  subject: string;
  body: string;
  fromName?: string | null;
  replyToEmail?: string | null;
  status: (typeof SOURCING_CAMPAIGN_STATUSES)[number];
  scheduledAt?: string | null;
  sentAt?: string | null;
  stats: SourcingCampaignStatsDto;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SourcingCampaignRecipientDto = {
  id: string;
  contactId: string;
  fullName: string;
  email: string;
  company?: string | null;
  title?: string | null;
  status: (typeof SOURCING_RECIPIENT_STATUSES)[number];
  sentAt?: string | null;
  error?: string | null;
};
