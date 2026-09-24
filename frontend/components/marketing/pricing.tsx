import { Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PLAN_PRICING, PLAN_TAGLINE, PRO_FEATURES, MAX_FEATURES, annualDiscount } from '@/lib/pricing';

export function PricingSection() {
  return (
    <section id="pricing" tabIndex={-1} className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16 md:py-24">
      <div className="flex flex-col items-center text-center">
        <Badge
          variant="outline"
          className="rounded-md bg-card/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Pricing
        </Badge>
        <h2 className="mt-4 text-mk-h2 text-foreground">Simple plans. Everything you need.</h2>
        <p className="mt-4 max-w-[440px] text-mk-body text-muted-foreground">
          The best investment for hiring the best talent.
          <br />
          Select the one which suits you.
        </p>
      </div>

      <div className="mt-12 px-0 sm:px-4">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <PricingCard
            label="Pro"
            tagline={PLAN_TAGLINE.PRO}
            monthly={PLAN_PRICING.PRO.monthly}
            annual={PLAN_PRICING.PRO.annual}
            discount={annualDiscount('PRO')}
            features={PRO_FEATURES}
          />
          <PricingCard
            label="Max"
            tagline={PLAN_TAGLINE.MAX}
            monthly={PLAN_PRICING.MAX.monthly}
            annual={PLAN_PRICING.MAX.annual}
            discount={annualDiscount('MAX')}
            features={MAX_FEATURES}
            featured
          />
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  label,
  tagline,
  monthly,
  annual,
  discount,
  features,
  featured = false,
}: {
  label: string;
  tagline: string;
  monthly: number;
  annual: number;
  discount: number;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-[12px] border p-6',
        featured ? 'border-berry-600 bg-berry-600 text-white' : 'border-border bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className={cn('text-mk-title', featured ? 'text-white' : 'text-foreground')}>{label}</h3>
          <p className={cn('mt-0.5 text-sm', featured ? 'text-white/70' : 'text-muted-foreground')}>{tagline}</p>
        </div>
        {featured && (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white">
            Most powerful
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span className={cn('mb-1 text-xl', featured ? 'text-white/60' : 'text-muted-foreground')}>$</span>
        <span className={cn('text-5xl font-semibold leading-none tracking-tight', featured ? 'text-white' : 'text-foreground')}>
          {monthly}
        </span>
        <span className={cn('mb-1 text-sm', featured ? 'text-white/60' : 'text-muted-foreground')}>/ month</span>
      </div>
      <p className={cn('mt-2 text-xs', featured ? 'text-white/70' : 'text-muted-foreground')}>
        or ${annual}/year billed annually — save {discount}%
      </p>

      <div className={cn('my-5 border-t', featured ? 'border-white/20' : 'border-border')} />
      <p
        className={cn(
          'mb-3 font-mono text-[11px] uppercase tracking-[0.08em]',
          featured ? 'text-white/60' : 'text-muted-foreground',
        )}
      >
        Includes
      </p>

      <ul className="flex-1 space-y-2.5">
        {features.map((f) => (
          <li
            key={f}
            className={cn('flex items-center gap-2.5 text-sm', featured ? 'text-white/90' : 'text-muted-foreground')}
          >
            <Check className={cn('size-4 shrink-0', featured ? 'text-white' : 'text-berry-600')} />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/sign-up"
        className={cn(
          'mt-6 flex w-full items-center justify-center gap-2 rounded-[8px] py-2.5 text-[14px] font-medium transition-colors',
          featured ? 'bg-white text-berry-600 hover:bg-berry-50' : 'bg-berry-600 text-white hover:bg-berry-700',
        )}
      >
        Get started
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
