'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Search, Sparkles, Users, Plus } from 'lucide-react';
import type { SourcingCriteria, SourcingSearchResultDto } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner';
import { getPlanUpgradeFlag } from '@/lib/api-client';
import { useCredits } from '@/hooks/use-billing';
import { useCreditErrorHandler } from '@/components/billing/credits-provider';
import { CostLabel } from '@/components/billing/cost-label';
import {
  useParsePrompt,
  useRunSearch,
  useUpdateCriteria,
  useLoadMore,
  useSearches,
  fetchSearch,
} from '@/hooks/use-talent-sourcing';
import { SearchHero } from './search-hero';
import { CriteriaChips } from './criteria-chips';
import { ContactResultsPanel } from './contact-results-panel';

/** Profiles fetched per page; only profiles new to the workspace are billed. */
const PAGE_SIZE = 25;

export function SourcingView() {
  const [prompt, setPrompt] = useState('');
  const [criteria, setCriteria] = useState<SourcingCriteria | null>(null);
  const [result, setResult] = useState<SourcingSearchResultDto | null>(null);

  const parse = useParsePrompt();
  const runSearch = useRunSearch();
  const updateCriteria = useUpdateCriteria();
  const loadMore = useLoadMore();
  const { data: recentSearches } = useSearches();
  const { credits } = useCredits();
  const handleCreditError = useCreditErrorHandler();

  const contacts = result?.contacts ?? [];
  const dirty = useMemo(
    () => Boolean(result && criteria && JSON.stringify(criteria) !== JSON.stringify(result.search.criteria)),
    [criteria, result],
  );

  const handleError = (err: unknown) => {
    if (handleCreditError(err)) return;
    if (getPlanUpgradeFlag(err)) {
      toast.error('Talent Sourcing is a Max feature', { description: 'Upgrade to the Max plan to source candidates.' });
    } else {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const onParse = (p: string) => {
    setPrompt(p);
    parse.mutate(p, { onSuccess: ({ criteria }) => setCriteria(criteria), onError: handleError });
  };
  const onSearch = () => {
    if (!criteria) return;
    runSearch.mutate({ prompt, criteria }, { onSuccess: setResult, onError: handleError });
  };
  const onRerun = () => {
    if (!result || !criteria) return;
    updateCriteria.mutate({ searchId: result.search.id, criteria }, { onSuccess: setResult, onError: handleError });
  };
  const onLoadMore = () => {
    if (!result) return;
    loadMore.mutate(result.search.id, { onSuccess: setResult, onError: handleError });
  };
  const openSearch = async (id: string) => {
    try {
      const res = await fetchSearch(id);
      setResult(res);
      setCriteria(res.search.criteria);
      setPrompt(res.search.prompt);
    } catch (err) {
      handleError(err);
    }
  };
  const reset = () => { setPrompt(''); setCriteria(null); setResult(null); };

  if (!criteria) {
    return (
      <SearchHero
        onSubmit={onParse}
        loading={parse.isPending}
        recentSearches={recentSearches}
        onOpenSearch={openSearch}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <button onClick={reset} className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> New search
          </button>
          <p className="truncate text-sm text-foreground">
            <span className="text-muted-foreground">Searching for:</span> {prompt}
          </p>
        </div>
        {credits && <span className="shrink-0 text-xs text-muted-foreground">{credits.total} credits left</span>}
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Review filters — edit any chip, then search
        </div>
        <CriteriaChips criteria={criteria} onChange={setCriteria} disabled={runSearch.isPending || updateCriteria.isPending} />
        <p className="text-xs text-muted-foreground">
          1.5 credits per new profile · people already in your contacts are free
        </p>
        <div className="flex items-center gap-2 pt-1">
          {!result ? (
            <Button onClick={onSearch} loading={runSearch.isPending}>
              <Search className="size-4" /> Search {PAGE_SIZE} profiles
              <CostLabel action="SOURCING_PROFILE" quantity={PAGE_SIZE} upTo />
            </Button>
          ) : dirty ? (
            <Button onClick={onRerun} loading={updateCriteria.isPending}>
              <Search className="size-4" /> Re-run search
              <CostLabel action="SOURCING_PROFILE" quantity={PAGE_SIZE} upTo />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {result.search.fetched} of ~{result.search.total} matches · {result.search.creditsUsed} credits used
            </span>
          )}
        </div>
      </Card>

      {(runSearch.isPending || updateCriteria.isPending) && !result ? (
        <Skeleton className="h-64 w-full" />
      ) : result && contacts.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No matches"
          description="Try widening your criteria — remove a filter or broaden the location."
        />
      ) : result ? (
        <ContactResultsPanel
          contacts={contacts}
          footer={
            result.search.canLoadMore ? (
              <div className="flex justify-center">
                <Button variant="outline" onClick={onLoadMore} loading={loadMore.isPending}>
                  <Plus className="size-4" /> Load {PAGE_SIZE} more
                  <CostLabel action="SOURCING_PROFILE" quantity={PAGE_SIZE} upTo />
                </Button>
              </div>
            ) : null
          }
        />
      ) : null}
    </div>
  );
}
