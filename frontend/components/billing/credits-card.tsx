'use client';

import { useState } from 'react';
import { Coins, Lightbulb, ReceiptText, Sparkles } from 'lucide-react';
import { CREDIT_PACKS, CREDIT_CATALOG, creditsFor, type CreditAction } from '@/lib/shared';
import { useCredits, useBuyCreditPack } from '@/hooks/use-billing';
import { RollText } from '@/components/marketing/landing/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Aside, CTA, Chip, FIGURE, Meter, Panel, PanelHeader, formatDate } from './billing-ui';

/**
 * The account's pooled AI-credit balance: what's left of the monthly
 * allowance (resets each period) and of purchased top-ups (never expire),
 * plus the applicant screenings the plan includes. Every member can see it.
 */
export function CreditsCard({ canManage, className, id }: { canManage: boolean; className?: string; id?: string }) {
  const { credits, isLoading } = useCredits();
  // The bar's full width is everything this period started with: the allowance plus purchased credits.
  const capacity = credits ? credits.allowancePerPeriod + credits.purchasedBalance : 0;

  return (
    <Panel id={id} className={cn('flex scroll-mt-8 flex-col', className)}>
      <PanelHeader
        icon={Sparkles}
        title="AI credits"
        aside={
          credits?.periodResetAt && (
            <Aside>Allowance resets {formatDate(credits.periodResetAt, { day: 'numeric', month: 'short' })}</Aside>
          )
        }
      />

      {isLoading || !credits ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <>
          <p className="mt-6 flex items-baseline gap-2">
            <span className={cn(FIGURE, 'text-[40px]')}>{credits.total.toLocaleString()}</span>
            <span className="font-inter text-[15px] text-lp-gray-600">credits available</span>
          </p>

          {capacity > 0 && (
            <>
              <Meter
                className="mt-5"
                segments={[
                  { value: credits.allowanceRemaining / capacity, className: 'bg-lp-blue-500' },
                  { value: credits.purchasedBalance / capacity, className: 'bg-lp-blue-400/45' },
                ]}
              />
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 font-inter text-[14px]">
                <Legend swatch="bg-lp-blue-500" label="Monthly allowance">
                  {credits.allowanceRemaining.toLocaleString()}
                  <span className="text-lp-gray-500"> of {credits.allowancePerPeriod.toLocaleString()}</span>
                </Legend>
                <Legend swatch="bg-lp-blue-400/45" label="Purchased">
                  {credits.purchasedBalance.toLocaleString()}
                </Legend>
              </dl>
            </>
          )}

          {credits.total <= 25 && (
            <p className="mt-5 rounded-xl bg-amber-50 px-3.5 py-2.5 font-inter text-[13px] leading-5 text-amber-800">
              {credits.total === 0 ? 'You’re out of AI credits.' : 'You’re running low on AI credits.'}{' '}
              {canManage ? 'Top up below to keep AI features running.' : 'Ask an owner or admin to top up.'}
            </p>
          )}

          {/* Pinned to the card's foot, level with the plan card's renewal line. */}
          {credits.screeningQuota > 0 && (
            <div className="mt-auto pt-6">
              <div className="border-t border-lp-gray-100 pt-5">
                <div className="flex items-baseline justify-between gap-4 font-inter text-[14px]">
                  <span className="text-lp-gray-700">Applicant screenings included</span>
                  <span className="shrink-0 font-medium tabular-nums text-black">
                    {credits.screeningsUsed.toLocaleString()}
                    <span className="font-normal text-lp-gray-500"> of {credits.screeningQuota.toLocaleString()}</span>
                  </span>
                </div>
                <Meter
                  className="mt-2.5 h-1.5"
                  segments={[{ value: credits.screeningsUsed / credits.screeningQuota, className: 'bg-lp-blue-400' }]}
                />
                <p className="mt-2 font-inter text-[12px] text-lp-gray-500">
                  After that, each applicant screened uses 1 credit.
                </p>
              </div>
            </div>
          )}

        </>
      )}
    </Panel>
  );
}

/** One key of the balance bar; the keys wrap onto their own lines when the card is narrow. */
function Legend({ swatch, label, children }: { swatch: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', swatch)} />
      <dt className="text-lp-gray-700">{label}</dt>
      <dd className="tabular-nums text-black">{children}</dd>
    </div>
  );
}

/** The smallest pack's price per credit, the baseline the bigger packs' savings are measured against. */
const BASE_RATE = CREDIT_PACKS[0].priceUsd / CREDIT_PACKS[0].credits;

/** Top-up picker: a slider across the credit packs, the chosen pack and its price, and the buy button. Owners and admins only. */
export function TopUpCard({ className }: { className?: string }) {
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
    <Panel className={cn('flex flex-col', className)}>
      <PanelHeader icon={Coins} title="Top up credits" aside={<Aside>Top-ups never expire</Aside>} />

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="flex items-baseline gap-2">
            <span className={cn(FIGURE, 'text-[32px]')}>{pack.credits.toLocaleString()}</span>
            <span className="font-inter text-[15px] text-lp-gray-600">credits</span>
          </p>
          <p className="mt-2.5 flex flex-wrap items-center gap-2 font-inter text-[13px] text-lp-gray-600">
            ${rate.toFixed(2)} per credit
            {saving > 0 && <Chip>Save {saving}%</Chip>}
          </p>
        </div>
        <p className={cn(FIGURE, 'text-[32px]')}>${pack.priceUsd}</p>
      </div>

      <Slider
        className="mt-6"
        min={0}
        max={CREDIT_PACKS.length - 1}
        step={1}
        value={index}
        onValueChange={(v) => setIndex(Array.isArray(v) ? v[0] : (v as number))}
        getAriaLabel={() => 'Credit pack'}
        getAriaValueText={(_, v) => `${CREDIT_PACKS[v].credits.toLocaleString()} credits for $${CREDIT_PACKS[v].priceUsd}`}
      />
      {/* Stop labels, spread like the slider's stops (the thumbs sit flush with the track's ends). */}
      <div className="mt-1.5 flex justify-between">
        {CREDIT_PACKS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-hidden
            tabIndex={-1}
            className={cn(
              'font-inter text-[13px] tabular-nums transition-colors hover:text-black',
              i === index ? 'font-medium text-black' : 'text-lp-gray-500',
            )}
          >
            {p.credits.toLocaleString()}
          </button>
        ))}
      </div>

      {/* What the pack buys in practice, at the two per-profile rates. */}
      <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-lp-gray-50 px-4 py-3 font-inter text-[13px] leading-5 text-lp-gray-600">
        <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-lp-blue-500" />
        <span>
          Enough for about{' '}
          <span className="font-medium text-black">
            {Math.floor(pack.credits / CREDIT_CATALOG.SOURCING_PROFILE.creditsPerUnit).toLocaleString()} sourced profiles
          </span>{' '}
          or{' '}
          <span className="font-medium text-black">
            {Math.floor(pack.credits / CREDIT_CATALOG.PROFILE_ENRICH.creditsPerUnit).toLocaleString()} profile enrichments
          </span>
          .
        </span>
      </p>

      {/* Pinned to the card's foot, level with the costs card beside it. */}
      <div className="mt-auto pt-6">
        <button type="button" onClick={buy} disabled={buyPack.isPending} className={CTA}>
          <RollText className="h-[1.3em]">
            {buyPack.isPending ? 'Redirecting…' : `Buy ${pack.credits.toLocaleString()} credits for $${pack.priceUsd}`}
          </RollText>
        </button>
      </div>
    </Panel>
  );
}

/** What each action costs, from the shared catalog (the same numbers the server charges). */
const COSTS: { action: CreditAction; label: string; note?: string; qty?: number }[] = [
  { action: 'SOURCING_PROFILE', label: 'Sourced profile', note: 'new only' },
  { action: 'PROFILE_ENRICH', label: 'Profile enrichment' },
  { action: 'COMPENSATION_LOOKUP', label: 'Compensation estimate' },
  { action: 'APPLICANT_SCREENING', label: 'Applicant screening', note: 'beyond your plan' },
  { action: 'JD_GENERATION', label: 'Job description' },
  { action: 'OUTREACH_DRAFT', label: 'Outreach AI draft' },
  { action: 'OUTREACH_EMAIL', label: 'Outreach emails', note: 'per 25', qty: 25 },
];

export function CreditCostsCard({ className }: { className?: string }) {
  return (
    <Panel className={className}>
      <PanelHeader icon={ReceiptText} title="Credit costs" />
      <dl className="mt-4 divide-y divide-lp-gray-100 font-inter text-[14px]">
        {COSTS.map(({ action, label, note, qty }) => {
          // A sourced profile costs a fraction of a credit; searches round the total up, so show the rate.
          const credits = action === 'SOURCING_PROFILE' ? CREDIT_CATALOG[action].creditsPerUnit : creditsFor(action, qty ?? 1);
          return (
            <div key={action} className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-lp-gray-700">
                {label}
                {note && <span className="ml-1.5 text-[12px] text-lp-gray-500">{note}</span>}
              </dt>
              <dd className="font-manrope font-semibold tabular-nums text-black">{credits}</dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 font-inter text-[12px] leading-5 text-lp-gray-500">
        Contacts you already have, search-prompt parsing and candidate emails are free. Failed or empty lookups are
        refunded automatically.
      </p>
    </Panel>
  );
}
