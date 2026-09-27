'use client';

import { Sparkles } from 'lucide-react';
import { CREDIT_PACKS, CREDIT_CATALOG, creditsFor, type CreditAction } from '@/lib/shared';
import { useCredits, useBuyCreditPack } from '@/hooks/use-billing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

/**
 * Billing-page card: the account's pooled AI-credit balance (monthly allowance
 * that resets vs. never-expiring purchased top-ups) plus the buy-more packs.
 * Purchases are owner/admin-only (the parent gates on `canManage`).
 */
export function CreditsCard({ canManage }: { canManage: boolean }) {
  const { credits, isLoading } = useCredits();
  const buyPack = useBuyCreditPack();

  const buy = async (packId: string) => {
    try {
      const { url } = await buyPack.mutateAsync(packId);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <CardTitle>AI credits</CardTitle>
        </div>
        <CardDescription>
          Shared across your whole account. Spent on AI and data actions — sourcing profiles, enrichment, AI drafts,
          outreach emails, and applicant screening beyond your plan&apos;s included amount.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading || !credits ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <div className="text-3xl font-semibold tabular-nums text-foreground">
                  {credits.total.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">credits available</div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="tabular-nums font-medium text-foreground">{credits.allowanceRemaining.toLocaleString()}</span>
                  <span>monthly allowance{credits.allowancePerPeriod > 0 && ` of ${credits.allowancePerPeriod.toLocaleString()}`}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="tabular-nums font-medium text-foreground">{credits.purchasedBalance.toLocaleString()}</span>
                  <span>purchased (never expires)</span>
                </div>
                {credits.screeningQuota > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="tabular-nums font-medium text-foreground">
                      {credits.screeningsUsed.toLocaleString()} / {credits.screeningQuota.toLocaleString()}
                    </span>
                    <span>included applicant screenings used this period</span>
                  </div>
                )}
                {credits.periodResetAt && (
                  <div className="text-xs text-muted-foreground">
                    Allowance resets {new Date(credits.periodResetAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <PriceList />

            {credits.total <= 25 && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                You&apos;re running low on AI credits. Buy a top-up pack to keep generating.
              </p>
            )}

            {canManage && (
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  Buy more credits
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {CREDIT_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => buy(pack.id)}
                      disabled={buyPack.isPending}
                      className={cn(
                        'flex flex-col items-start rounded-lg border border-border bg-white p-4 text-left transition-colors',
                        'hover:border-primary hover:bg-accent disabled:opacity-60',
                      )}
                    >
                      <span className="text-lg font-semibold tabular-nums text-foreground">
                        {pack.credits.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">credits</span>
                      <span className="mt-2 text-sm font-medium text-primary">${pack.priceUsd}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** What each action costs, straight from the shared catalog (the same numbers the server charges). */
const PRICE_ROWS: { action: CreditAction; per: string; qty?: number }[] = [
  { action: 'SOURCING_PROFILE', per: 'per new sourced profile', qty: 1 },
  { action: 'PROFILE_ENRICH', per: 'per profile enrichment' },
  { action: 'COMPENSATION_LOOKUP', per: 'per compensation estimate' },
  { action: 'APPLICANT_SCREENING', per: 'per applicant screened beyond your plan' },
  { action: 'JD_GENERATION', per: 'per job description' },
  { action: 'OUTREACH_DRAFT', per: 'per AI outreach draft' },
  { action: 'OUTREACH_EMAIL', per: 'per 25 outreach emails', qty: 25 },
];

function PriceList() {
  return (
    <details className="group rounded-lg border border-border px-4 py-3 text-sm">
      <summary className="cursor-pointer select-none font-medium text-foreground">What credits are spent on</summary>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {PRICE_ROWS.map(({ action, per, qty }) => {
          const entry = CREDIT_CATALOG[action];
          const n = action === 'SOURCING_PROFILE' ? entry.creditsPerUnit : creditsFor(action, qty ?? 1);
          return (
            <li key={action} className="flex items-baseline justify-between gap-3 text-muted-foreground">
              <span>{entry.label} <span className="text-xs">({per})</span></span>
              <span className="shrink-0 tabular-nums font-medium text-foreground">{n}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        People already in your contacts, search-prompt parsing, and candidate emails are free. Failed or empty lookups
        are refunded automatically.
      </p>
    </details>
  );
}
