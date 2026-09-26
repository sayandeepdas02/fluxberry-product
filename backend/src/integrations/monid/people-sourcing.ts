import { logger } from '../../utils/logger';
import { MonidClient } from './client';
import { searchApollo, enrichApolloPerson } from './apollo';
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
    const page = decodePage(input.scrollToken);
    const perPage = Math.max(1, Math.min(100, input.size));

    const { previews, total } = await searchApollo(this.client, input.criteria, page, perPage);

    const enriched = await mapWithConcurrency(previews, ENRICH_CONCURRENCY, async (preview) => {
      try {
        return await enrichApolloPerson(this.client, preview.id);
      } catch (err) {
        logger.warn({ err, apolloId: preview.id }, 'Apollo enrich failed for one result, skipping');
        return null;
      }
    });

    const people: SourcedPerson[] = enriched.filter((p): p is SourcedPerson => p != null);
    const hasMore = page * perPage < total;

    return {
      people,
      total,
      scrollToken: hasMore ? encodePage(page + 1) : null,
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

// Apollo pages by 1-based page number, not an opaque cursor — encode/decode it
// the same opaque-token way the mock provider does, so callers never care.
function encodePage(page: number): string {
  return Buffer.from(`page:${page}`).toString('base64');
}
function decodePage(token?: string | null): number {
  if (!token) return 1;
  try {
    const s = Buffer.from(token, 'base64').toString('utf8');
    const m = s.match(/^page:(\d+)$/);
    return m ? Number(m[1]) : 1;
  } catch {
    return 1;
  }
}
