import { Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Section, SectionIntro } from './frame';

const FREE_FEATURES = [
  '3 active job posts',
  'Unlimited candidates',
  'AI applicant scoring',
  'Custom pipeline stages',
  'Application forms',
  'Team collaboration',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited job posts',
  'Advanced analytics',
  'Bulk candidate import',
  'GDPR tools',
  'Outbound webhooks',
];

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
          Start free and upgrade to Pro when you need more. No hidden fees, cancel any time.
        </p>
      </SectionIntro>

      <div className="px-8 pb-16 sm:px-12">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <PlanCard
            name="Free"
            price="0"
            period="/ month"
            description="For small teams just getting started with hiring."
            features={FREE_FEATURES}
            cta={{ label: 'Get started', href: '/sign-up', filled: false }}
          />
          <PlanCard
            name="Pro"
            price="40"
            period="/ month"
            pricingNote="or $17 / month billed annually — save 58%"
            description="For teams that need the full platform unlocked."
            features={PRO_FEATURES}
            badge="Most popular"
            cta={{ label: 'Get started', href: '/sign-up', filled: true }}
          />
        </div>
      </div>
    </Section>
  );
}

function PlanCard({
  name,
  price,
  period,
  pricingNote,
  description,
  features,
  badge,
  cta,
}: {
  name: string;
  price: string;
  period: string;
  pricingNote?: string;
  description: string;
  features: string[];
  badge?: string;
  cta: { label: string; href: string; filled: boolean };
}) {
  return (
    <div className="flex flex-col rounded-[12px] border border-ink-200 bg-white p-6">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-ink">{name}</h3>
        {badge && (
          <span className="rounded-full bg-berry-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span className="mb-1 text-xl text-ink-400">$</span>
        <span className="text-5xl font-extrabold leading-none tracking-tighter text-ink">{price}</span>
        <span className="mb-1 text-sm text-ink-400">{period}</span>
      </div>

      <p className="mt-2 text-sm text-ink-500">{description}</p>
      {pricingNote && (
        <p className="mt-1 text-[12px] text-ink-400">{pricingNote}</p>
      )}

      <div className="my-5 border-t border-ink-line" />
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">Includes</p>

      <ul className="flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-sm text-ink-600">
            <Check className="size-4 shrink-0 text-berry-600" />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={cta.href}
        className={cn(
          'mt-6 flex w-full items-center justify-center gap-2 rounded-[8px] py-2.5 text-[14px] font-medium transition-colors',
          cta.filled
            ? 'bg-berry-600 text-white hover:bg-berry-700'
            : 'border border-ink-200 text-ink hover:bg-ink-50',
        )}
      >
        {cta.label}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
