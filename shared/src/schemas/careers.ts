import { z } from 'zod';
import type {
  EmploymentType,
  WorkMode,
} from '../enums';
import type { SalaryRange } from '../common';

/** Slugs that would collide with app/public routes — not selectable as a careers slug. */
export const RESERVED_SLUGS = [
  'app', 'apply', 'api', 'login', 'signup', 'onboarding', 'assessment', 'interview',
  'embed', 'careers', 'settings', 'admin', 'public', 'static', 'assets', 'help',
  'docs', 'www', 'about', 'pricing', 'blog', 'jobs', 'candidates',
];

export const careersSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'At least 2 characters')
  .max(40, 'At most 40 characters')
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use lowercase letters, numbers, and hyphens')
  .refine((s) => !RESERVED_SLUGS.includes(s), 'That URL is reserved');

export const setCareersSlugSchema = z.object({ slug: careersSlugSchema });
export type SetCareersSlugInput = z.infer<typeof setCareersSlugSchema>;

export const careersLinkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  url: z.string().trim().url(),
});
export type CareersLink = z.infer<typeof careersLinkSchema>;

export const careersTeamMemberSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().max(80).optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});
export type CareersTeamMember = z.infer<typeof careersTeamMemberSchema>;

export const updateCareersSchema = z.object({
  headline: z.string().trim().max(120).optional(),
  tagline: z.string().trim().max(280).optional(),
  published: z.boolean().optional(),
  about: z.object({ enabled: z.boolean(), content: z.string().max(4000) }).optional(),
  links: z.object({ enabled: z.boolean(), items: z.array(careersLinkSchema).max(12) }).optional(),
  team: z.object({ enabled: z.boolean(), members: z.array(careersTeamMemberSchema).max(24) }).optional(),
  jobs: z.object({ enabled: z.boolean(), heading: z.string().trim().max(80) }).optional(),
});
export type UpdateCareersInput = z.infer<typeof updateCareersSchema>;

export type CareersPageDto = {
  slug: string | null;
  published: boolean;
  headline: string;
  tagline: string;
  about: { enabled: boolean; content: string };
  links: { enabled: boolean; items: CareersLink[] };
  team: { enabled: boolean; members: CareersTeamMember[] };
  jobs: { enabled: boolean; heading: string };
  updatedAt: string;
};

/** A job shown on the public careers page. */
export type PublicCareersJob = {
  title: string;
  location?: string | null;
  employmentType: EmploymentType;
  workMode: WorkMode;
  salary?: SalaryRange | null;
  applyPath: string; // e.g. /apply/<workspaceSlug>/<jobSlug>
};

export type PublicCareersDto = {
  company: { name: string; logoUrl?: string | null; careersSlug: string };
  headline: string;
  tagline: string;
  about: { enabled: boolean; content: string };
  links: { enabled: boolean; items: CareersLink[] };
  team: { enabled: boolean; members: CareersTeamMember[] };
  jobs: { enabled: boolean; heading: string };
  openings: PublicCareersJob[];
};
