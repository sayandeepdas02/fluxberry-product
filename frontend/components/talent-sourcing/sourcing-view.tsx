'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Search, Sparkles, Users, Plus } from 'lucide-react';
import type { SourcingCriteria, SourcingSearchResultDto } from '@/lib/shared';
import { CREDIT_COSTS } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner';
import { getInsufficientCredits, getPlanUpgradeFlag } from '@/lib/api-client';
import { useCredits } from '@/hooks/use-billing';
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

const PAGE_COST = CREDIT_COSTS.SOURCING_SEARCH;

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

  const contacts = result?.contacts ?? [];
  const dirty = useMemo(
    () => Boolean(result && criteria && JSON.stringify(criteria) !== JSON.stringify(result.search.criteria)),
    [criteria, result],
  );

  const handleError = (err: unknown) => {
    if (getInsufficientCredits(err)) {
      toast.error('Not enough AI credits', {
        description: 'Top up or upgrade your plan to keep sourcing.',
        action: { label: 'Billing', onClick: () => (window.location.href = '/app/settings/billing') },
      });
    } else if (getPlanUpgradeFlag(err)) {
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
        <div className="flex items-center gap-2 pt-1">
          {!result ? (
            <Button onClick={onSearch} loading={runSearch.isPending}>
              <Search className="size-4" /> Search 25 profiles · {PAGE_COST} credits
            </Button>
          ) : dirty ? (
            <Button onClick={onRerun} loading={updateCriteria.isPending}>
              <Search className="size-4" /> Re-run search · {PAGE_COST} credits
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
                  <Plus className="size-4" /> Load 25 more · {PAGE_COST} credits
                </Button>
              </div>
            ) : null
          }
        />
      ) : null}
    </div>
  );
}
