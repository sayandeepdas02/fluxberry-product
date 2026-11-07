import { z } from 'zod';
import { OFFER_STATUSES } from '../enums';
import type { OfferStatus } from '../enums';

export const createOfferSchema = z.object({
  baseSalary: z.number().positive(),
  currency: z.string().min(1).max(10).default('USD'),
  bonus: z.number().optional(),
  equity: z.string().max(200).optional(),
  startDate: z.union([z.string().min(1), z.date()]).pipe(z.coerce.date()),
  employmentType: z.string().optional(),
  expiresAt: z.union([z.string().min(1), z.date()]).pipe(z.coerce.date()),
  note: z.string().max(2000).optional(),
});
export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export const updateOfferSchema = createOfferSchema.partial();
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;

export const offerDecisionSchema = z.object({
  decision: z.enum(['ACCEPT', 'DECLINE']),
  note: z.string().max(500).optional(),
});
export type OfferDecisionInput = z.infer<typeof offerDecisionSchema>;

/** Compensation details attached to an offer. */
export type OfferCompensationDto = {
  baseSalary: number;
  currency: string;
  bonus?: number | null;
  equity?: string | null;
  startDate: string;
  employmentType?: string | null;
};

/** Internal (recruiter-facing) view of an offer. */
export type OfferDto = {
  id: string;
  workspaceId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  status: OfferStatus;
  compensation: OfferCompensationDto;
  note?: string | null;
  expiresAt: string;
  sentAt?: string | null;
  respondedAt?: string | null;
  decisionNote?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Candidate-facing view at the token-gated public offer link — no internal ids beyond what's needed. */
export type PublicOfferDto = {
  status: OfferStatus;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  compensation: OfferCompensationDto;
  note?: string | null;
  expiresAt: string;
  sentAt?: string | null;
  respondedAt?: string | null;
};

export { OFFER_STATUSES };
