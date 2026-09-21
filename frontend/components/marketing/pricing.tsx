import { Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Section, SectionIntro } from './frame';

const PRO_FEATURES = [
  'Unlimited job posts',
  'Unlimited candidates',
  'AI applicant scoring',
  'Custom pipeline stages',
  'Application forms',
  'Team collaboration',
  'Advanced analytics',
  'Bulk candidate import',
  'GDPR tools',
  'Outbound webhooks',
];

// Monthly $40 × 12 = $480/yr. Annual = $200/yr. Savings = 58%.
const ANNUAL_DISCOUNT = '58%';

export function PricingSection() {
  return (
    <Section id="pricing">
      <SectionIntro className="flex flex-col items-center text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">Pricing</span>
        <h2 className="mt-4 text-mk-h2 text-ink">
          Simple plans.
          <br />
          <span className="text-ink-muted">Everything you need.</span>
        </h2>
        <p className="mt-4 max-w-[440px] text-mk-body text-ink-500">
          One plan, full access. Choose monthly for flexibility or pay annually to save.
        </p>
      </SectionIntro>

      <div className="px-8 pb-16 sm:px-12">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <BillingCard
            label="Monthly"
            price="40"
            period="/ month"
            features={PRO_FEATURES}
            filled
            cta="/sign-up"
          />
          <BillingCard
            label="Annual"
            price="200"
            period="/ year"
            features={PRO_FEATURES}
            discount={ANNUAL_DISCOUNT}
            featured
            cta="/sign-up"
          />
        </div>
      </div>
    </Section>
  );
}

function BillingCard({
  label,
  price,
  period,
  features,
  discount,
  featured = false,
  filled = false,
  cta,
}: {
  label: string;
  price: string;
  period: string;
  features: string[];
  discount?: string;
  featured?: boolean;
  filled?: boolean;
  cta: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-[12px] border p-6',
        featured
          ? 'border-berry-600 bg-berry-600 text-white'
          : 'border-ink-200 bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={cn('text-base font-semibold', featured ? 'text-white' : 'text-ink')}>
          {label}
        </h3>
        {featured && (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-white">
            Most Recommended
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span className={cn('mb-1 text-xl', featured ? 'text-white/60' : 'text-ink-400')}>$</span>
        <span className={cn('text-5xl font-semibold leading-none tracking-tight', featured ? 'text-white' : 'text-ink')}>
          {price}
        </span>
        <span className={cn('mb-1 text-sm', featured ? 'text-white/60' : 'text-ink-400')}>{period}</span>
        {discount && (
          <span className="mb-1 ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
            {discount} off
          </span>
        )}
      </div>

      <div className={cn('my-5 border-t', featured ? 'border-white/20' : 'border-ink-line')} />
      <p className={cn('mb-3 font-mono text-[11px] uppercase tracking-[0.08em]', featured ? 'text-white/60' : 'text-ink-400')}>
        Includes
      </p>

      <ul className="flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className={cn('flex items-center gap-2.5 text-sm', featured ? 'text-white/90' : 'text-ink-600')}>
            <Check className={cn('size-4 shrink-0', featured ? 'text-white' : 'text-berry-600')} />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={cta}
        className={cn(
          'mt-6 flex w-full items-center justify-center gap-2 rounded-[8px] py-2.5 text-[14px] font-medium transition-colors',
          featured
            ? 'bg-white text-berry-600 hover:bg-berry-50'
            : filled
            ? 'bg-berry-600 text-white hover:bg-berry-700'
            : 'border border-ink-200 text-ink hover:bg-ink-50',
        )}
      >
        Get started
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
