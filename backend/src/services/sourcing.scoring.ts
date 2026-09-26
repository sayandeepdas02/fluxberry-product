import type { SourcingCriteria } from '../shared';

/**
 * Transparent, deterministic 0–100 fit score for a sourced person against the
 * parsed criteria (spec §78). Only the dimensions the recruiter actually
 * specified contribute — the weighted sum is normalized by the active weights —
 * so a broad prompt doesn't unfairly punish everyone. The same pure function is
 * used when a search runs and when it's rehydrated, so ranking is stable.
 */

export interface ScorablePerson {
  title?: string | null;
  seniority?: string | null;
  skills?: string[] | null;
  yearsExperience?: number | null;
  location?: string | null;
  country?: string | null;
}

export interface MatchResult {
  score: number;
  reasons: string[];
}

const WEIGHTS = { skills: 40, titles: 22, seniority: 14, years: 12, location: 12 } as const;

function norm(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * True if every token of the shorter phrase appears as a whole token in the
 * longer one. Token-level (not substring) matching so a one/two-letter skill
 * like "R" or "C" doesn't spuriously match "Rust" or "Scala".
 */
/** Exported for reuse — e.g. the Apollo people-search post-filter on `organization.name` (see integrations/monid/apollo.ts). */
export function looseMatch(haystack: string, needle: string): boolean {
  const tokens = (s: string) => norm(s).split(/[^a-z0-9+#.]+/).filter(Boolean);
  const h = tokens(haystack);
  const n = tokens(needle);
  if (!h.length || !n.length) return false;
  const [small, big] = h.length <= n.length ? [h, new Set(n)] : [n, new Set(h)];
  return small.every((t) => big.has(t));
}

export function scoreContact(criteria: SourcingCriteria, person: ScorablePerson): MatchResult {
  const reasons: string[] = [];
  let weighted = 0;
  let activeWeight = 0;

  // Skills — share of requested skills present. Excluded from activeWeight
  // entirely (not just scored 0) when the person has no skills data at all —
  // e.g. a freshly Apollo-sourced contact before any PDL backfill — so a
  // missing-data gap doesn't get counted the same as a genuine mismatch.
  if (criteria.skills.length && (person.skills?.length ?? 0) > 0) {
    activeWeight += WEIGHTS.skills;
    const have = new Set((person.skills ?? []).map(norm));
    const matched = criteria.skills.filter((s) =>
      have.has(norm(s)) || [...have].some((h) => looseMatch(h, s)),
    );
    const sub = matched.length / criteria.skills.length;
    weighted += WEIGHTS.skills * sub;
    if (matched.length) {
      const shown = matched.slice(0, 4).join(', ');
      reasons.push(
        `Matches ${matched.length}/${criteria.skills.length} skills (${shown}${matched.length > 4 ? '…' : ''})`,
      );
    }
  }

  // Title / role.
  if (criteria.titles.length && person.title) {
    activeWeight += WEIGHTS.titles;
    const hit = criteria.titles.find((t) => looseMatch(person.title!, t));
    if (hit) {
      weighted += WEIGHTS.titles;
      reasons.push(`Title matches “${hit}”`);
    }
  }

  // Seniority band.
  if (criteria.seniority.length && person.seniority) {
    activeWeight += WEIGHTS.seniority;
    if (criteria.seniority.map(norm).includes(norm(person.seniority))) {
      weighted += WEIGHTS.seniority;
      reasons.push(`${titleCase(person.seniority)} level`);
    }
  }

  // Years of experience within the requested band.
  if ((criteria.minYears != null || criteria.maxYears != null) && person.yearsExperience != null) {
    activeWeight += WEIGHTS.years;
    const yrs = person.yearsExperience;
    const min = criteria.minYears ?? 0;
    const max = criteria.maxYears ?? Infinity;
    if (yrs >= min && yrs <= max) {
      weighted += WEIGHTS.years;
      const want = criteria.maxYears != null ? `${min}–${criteria.maxYears}` : `${min}+`;
      reasons.push(`${yrs} yrs experience (wants ${want})`);
    } else {
      // Partial credit for being close to the band.
      const gap = yrs < min ? min - yrs : yrs - max;
      weighted += WEIGHTS.years * Math.max(0, 1 - gap / 4);
    }
  }

  // Location / country.
  const places = [...criteria.locations, ...criteria.countries];
  if (places.length && (person.location || person.country)) {
    activeWeight += WEIGHTS.location;
    const hay = `${person.location ?? ''} ${person.country ?? ''}`;
    const hit = places.find((p) => looseMatch(hay, p));
    if (hit) {
      weighted += WEIGHTS.location;
      reasons.push(`Based in ${person.location ?? titleCase(hit)}`);
    }
  }

  if (activeWeight === 0) {
    return { score: 60, reasons: ['Broad match — no specific criteria set'] };
  }
  const score = Math.round((weighted / activeWeight) * 100);
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
