import type { PublicJobDto, FormQuestion, PublicCareersDto, PublicCareersJob } from '@fluxberry/shared';
import { publicConfig } from './config';

export interface PublicJobPayload {
  job: PublicJobDto;
  questions: FormQuestion[];
}

/** Server-side fetch of a public job (no auth). Returns null on 404. */
export async function fetchPublicJob(
  workspaceSlug: string,
  jobSlug: string,
): Promise<PublicJobPayload | null> {
  try {
    const res = await fetch(
      `${publicConfig.apiUrl}/api/v1/public/jobs/${encodeURIComponent(workspaceSlug)}/${encodeURIComponent(jobSlug)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as PublicJobPayload) : null;
  } catch {
    return null;
  }
}

/** Server-side resolve of a `/r/:code` referral link. Returns null on 404 (unknown/removed code). */
export async function fetchReferralTarget(code: string): Promise<{ workspaceSlug: string; jobSlug: string } | null> {
  try {
    const res = await fetch(`${publicConfig.apiUrl}/api/v1/public/referrals/${encodeURIComponent(code)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as { workspaceSlug: string; jobSlug: string }) : null;
  } catch {
    return null;
  }
}

export async function fetchPublicCareers(slug: string, previewToken?: string): Promise<PublicCareersDto | null> {
  try {
    const url = new URL(`${publicConfig.apiUrl}/api/v1/public/careers/${encodeURIComponent(slug)}`);
    if (previewToken) url.searchParams.set('preview', previewToken);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as PublicCareersDto) : null;
  } catch {
    return null;
  }
}

export interface PublicCareersJobs {
  company: { name: string; logoUrl?: string | null; careersSlug: string };
  heading: string;
  openings: PublicCareersJob[];
}

export async function fetchPublicCareersJobs(slug: string): Promise<PublicCareersJobs | null> {
  try {
    const res = await fetch(`${publicConfig.apiUrl}/api/v1/public/careers/${encodeURIComponent(slug)}/jobs`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as PublicCareersJobs) : null;
  } catch {
    return null;
  }
}

