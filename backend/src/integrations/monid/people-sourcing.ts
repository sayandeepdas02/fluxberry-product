import { logger } from '../../utils/logger';
import { MonidClient } from './client';
import { searchApollo, enrichApolloPerson, type ApolloSearchCursor } from './apollo';
import { backfillFromPdl } from './pdl-backfill';
import type {
  BackfillFields,
  PeopleSourcingProvider,
  PersonSearchInput,
  PersonSearchResult,
  SourcedPerson,
} from './types';

const ENRICH_CONCURRENCY = 8;

/**
 * Live people-sourcing provider, brokered through Monid: Apollo does the
 * search + eager enrich (name/title/company/location/work-email — every
 * result must be enriched to be usable at all, since Apollo's free search
 * only returns redacted previews). PDL backfill (skills/education/github/
 * personal email) is NOT called here — it's lazy, invoked separately by
 * `sourcing.service.ts` only when a recruiter opens a contact whose data has
 * a gap (see hasEnrichmentGap in ./types and pdl-backfill.ts).
 */
export class MonidPeopleSourcingProvider implements PeopleSourcingProvider {
  readonly name = 'monid';
  private readonly client: MonidClient;

  constructor(apiKey: string) {
    this.client = new MonidClient(apiKey);
  }

  async search(input: PersonSearchInput): Promise<PersonSearchResult> {
    const cursor = decodeCursor(input.scrollToken);
    const perPage = Math.max(1, Math.min(100, input.size));

    const { previews, total, nextCursor } = await searchApollo(this.client, input.criteria, cursor, perPage);

    // Apollo's search is free; /people/match is the paid step ($0.05). Skip it
    // for people the workspace already has cached — they come back as knownIds.
    const known = input.resolveKnown ? await input.resolveKnown(previews.map((p) => p.id)) : new Set<string>();
    const toEnrich = previews.filter((p) => !known.has(p.id));

    const enriched = await mapWithConcurrency(toEnrich, ENRICH_CONCURRENCY, async (preview) => {
      try {
        return await enrichApolloPerson(this.client, preview.id);
      } catch (err) {
        logger.warn({ err, apolloId: preview.id }, 'Apollo enrich failed for one result, skipping');
        return null;
      }
    });

    const people: SourcedPerson[] = enriched.filter((p): p is SourcedPerson => p != null);

    return {
      people,
      knownIds: previews.filter((p) => known.has(p.id)).map((p) => p.id),
      total,
      // Driven by Apollo's real page-exhaustion signal, not `total` — `total` is
      // an unfiltered upper bound whenever a company filter is active (see
      // searchApollo) and can't safely gate whether "load more" is worth charging for.
      scrollToken: nextCursor != null ? encodeCursor(nextCursor) : null,
      creditsUsed: people.length,
    };
  }

  async backfill(person: Pick<SourcedPerson, 'fullName' | 'company' | 'workEmail' | 'linkedinUrl'>): Promise<BackfillFields | null> {
    return backfillFromPdl(this.client, person);
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Apollo pages by page number + an in-page offset (see ApolloSearchCursor),
// not an opaque cursor — encode/decode it the same opaque-token way the mock
// provider does, so callers never care.
function encodeCursor(cursor: ApolloSearchCursor): string {
  return Buffer.from(`page:${cursor.upstreamPage}:${cursor.offset}`).toString('base64');
}
function decodeCursor(token?: string | null): ApolloSearchCursor {
  if (!token) return { upstreamPage: 1, offset: 0 };
  try {
    const s = Buffer.from(token, 'base64').toString('utf8');
    const m = s.match(/^page:(\d+):(\d+)$/);
    return m ? { upstreamPage: Number(m[1]), offset: Number(m[2]) } : { upstreamPage: 1, offset: 0 };
  } catch {
    return { upstreamPage: 1, offset: 0 };
  }
}
