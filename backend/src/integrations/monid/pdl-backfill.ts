import { logger } from '../../utils/logger';
import { MonidOperationalError, type MonidClient } from './client';
import type { BackfillFields, SourcedPerson } from './types';

/**
 * PDL, via Monid (provider slug "pdl"), used ONLY as a targeted backfill —
 * never for search. Apollo has no skills/education/githubUrl/personalEmail
 * data; when a contact is missing them we call PDL's Person Enrichment API
 * ($0.30/call) with whatever identifiers Apollo gave us (name + company, plus
 * email when Apollo revealed one) to fill the gap. Lazy — invoked only when a
 * recruiter opens a contact's detail view and a gap is actually present (see
 * hasEnrichmentGap in ./types), never during bulk search.
 */

interface PdlEnrichResponse {
  status?: number;
  likelihood?: number;
  data?: PdlPerson;
}

interface PdlPerson {
  skills?: string[];
  github_url?: string;
  personal_emails?: string[];
  emails?: Array<{ address?: string; type?: string }>;
  education?: Array<{
    degrees?: string[];
    school?: { name?: string };
    majors?: string[];
  }>;
  inferred_years_experience?: number;
}

/**
 * Attempts to backfill the Apollo-blind fields for one person. Returns null
 * (not an error) on a genuine no-match — PDL's ~3B-profile dataset still won't
 * cover everyone, and a miss shouldn't block the rest of the contact detail
 * view. A `MonidOperationalError` (bad key, empty wallet, unreachable, etc.)
 * is NOT a no-match and is re-thrown — the caller (sourcing.service.ts) must
 * not permanently remember an outage as "already tried."
 */
export async function backfillFromPdl(
  client: MonidClient,
  person: Pick<SourcedPerson, 'fullName' | 'company' | 'workEmail' | 'linkedinUrl'>,
): Promise<BackfillFields | null> {
  const body: Record<string, unknown> = {
    name: person.fullName,
    company: person.company,
    min_likelihood: 4,
  };
  if (person.workEmail) body.email = person.workEmail;
  if (person.linkedinUrl) body.profile = person.linkedinUrl;

  let output: PdlEnrichResponse;
  try {
    output = (await client.run('pdl', '/v5/person/enrich', { body })) as PdlEnrichResponse;
  } catch (err) {
    if (err instanceof MonidOperationalError) throw err;
    logger.warn({ err }, 'PDL backfill enrich failed — treating as no match');
    return null;
  }

  const p = output.data;
  if (!p) return null;

  const personalEmail = p.personal_emails?.[0] ?? p.emails?.find((e) => e.type === 'personal')?.address;

  return {
    skills: (p.skills ?? []).slice(0, 20),
    githubUrl: p.github_url ? ensureHttps(p.github_url) : undefined,
    personalEmail: personalEmail ?? undefined,
    education: (p.education ?? []).slice(0, 3).map((e) => ({
      degree: e.degrees?.[0],
      school: e.school?.name,
      major: e.majors?.[0],
    })),
    yearsExperience: p.inferred_years_experience,
  };
}

function ensureHttps(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}
