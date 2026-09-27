'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CREDIT_PACKS, CREDIT_CATALOG, creditsFor, type CreditAction } from '@/lib/shared';
import { useCredits, useBuyCreditPack } from '@/hooks/use-billing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

/**
 * Billing card on the pricing page: the account's pooled AI-credit balance (monthly allowance
 * that resets vs. never-expiring purchased top-ups) plus the buy-more packs.
 * Purchases are owner/admin-only (the parent gates on `canManage`).
 */
export function CreditsCard({ canManage }: { canManage: boolean }) {
  const { credits, isLoading } = useCredits();

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

            {canManage && <BuyCredits />}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** The smallest pack's price per credit, the baseline the bigger packs' savings are measured against. */
const BASE_RATE = CREDIT_PACKS[0].priceUsd / CREDIT_PACKS[0].credits;

/** Top-up picker: a slider across the credit packs, the chosen pack's price, and a buy button. */
function BuyCredits() {
  const [index, setIndex] = useState(Math.min(1, CREDIT_PACKS.length - 1));
  const buyPack = useBuyCreditPack();
  const pack = CREDIT_PACKS[index];
  const rate = pack.priceUsd / pack.credits;
  const saving = Math.round((1 - rate / BASE_RATE) * 100);

  const buy = async () => {
    try {
      const { url } = await buyPack.mutateAsync(pack.id);
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout');
    }
  };

  return (
    <div>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        Buy more credits
      </p>
      <div className="rounded-lg border border-border p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {pack.credits.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">credits</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ${rate.toFixed(2)} per credit
              {saving > 0 && <span className="font-medium text-success"> · save {saving}%</span>}
            </p>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">${pack.priceUsd}</p>
        </div>

        <Slider
          className="mt-5"
          min={0}
          max={CREDIT_PACKS.length - 1}
          step={1}
          value={index}
          onValueChange={(v) => setIndex(Array.isArray(v) ? v[0] : (v as number))}
          getAriaLabel={() => 'Credit pack'}
          getAriaValueText={(_, v) => `${CREDIT_PACKS[v].credits.toLocaleString()} credits for $${CREDIT_PACKS[v].priceUsd}`}
        />
        {/* Stop labels, spread like the slider's stops (the thumbs sit flush with the track's ends). */}
        <div className="mt-1 flex justify-between">
          {CREDIT_PACKS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-hidden
              tabIndex={-1}
              className={cn(
                'text-xs tabular-nums transition-colors hover:text-foreground',
                i === index ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {p.credits.toLocaleString()}
            </button>
          ))}
        </div>

        <Button className="mt-5 w-full" loading={buyPack.isPending} onClick={buy}>
          Buy {pack.credits.toLocaleString()} credits for ${pack.priceUsd}
        </Button>
      </div>
    </div>
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
