import { Check, PlusIcon, ShieldCheckIcon, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BorderTrail } from '@/components/ui/border-trail';
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
    <Section id="pricing" className="px-8 py-[88px]">
      <SectionIntro className="px-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500">Pricing</span>
        </div>
        <h2 className="mt-4 max-w-xl text-[clamp(28px,3vw,40px)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
          One plan.
          <br />
          <span className="text-ink-muted">Pay less when you commit.</span>
        </h2>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-500">
          Fluxberry Pro unlocks advanced analytics, bulk import, GDPR tools, and webhooks.
          Choose monthly for flexibility or annual to save 58%.
        </p>
      </SectionIntro>

      <div className="relative mt-10">
        {/* faint grid backdrop */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-0',
            'bg-[linear-gradient(to_right,theme(colors.ink.200)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.ink.200)_1px,transparent_1px)]',
            'bg-[size:32px_32px]',
            '[mask-image:radial-gradient(ellipse_at_center,transparent_10%,black)]',
          )}
        />

        <div className="relative mx-auto w-full max-w-2xl space-y-2">
          {/* pricing cards */}
          <div className="relative grid border bg-background md:grid-cols-2">
            <PlusIcon className="absolute -left-3 -top-3 size-5.5 text-ink-300" />
            <PlusIcon className="absolute -right-3 -top-3 size-5.5 text-ink-300" />
            <PlusIcon className="absolute -bottom-3 -left-3 size-5.5 text-ink-300" />
            <PlusIcon className="absolute -bottom-3 -right-3 size-5.5 text-ink-300" />

            {/* Monthly */}
            <div className="w-full px-6 pb-6 pt-5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold leading-none text-ink">Monthly</h3>
                </div>
                <p className="text-sm text-ink-500">Flexible, cancel any time.</p>
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex items-end gap-0.5 text-xl text-ink-400">
                  <span>$</span>
                  <span className="-mb-0.5 text-4xl font-extrabold tracking-tighter text-ink md:text-5xl">40</span>
                  <span>/month</span>
                </div>
                <Button className="w-full" variant="outline" asChild>
                  <a href="/sign-up">Get started</a>
                </Button>
              </div>
            </div>

            {/* Annual */}
            <div className="relative w-full rounded-lg border px-6 pb-6 pt-5">
              <BorderTrail
                style={{
                  boxShadow:
                    '0px 0px 60px 30px rgb(255 255 255 / 50%), 0 0 100px 60px rgb(0 0 0 / 50%), 0 0 140px 90px rgb(0 0 0 / 50%)',
                }}
                size={100}
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold leading-none text-ink">Annual</h3>
                  <div className="flex items-center gap-x-1.5">
                    <span className="text-sm text-ink-400 line-through">$40/mo</span>
                    <Badge variant="primary">58% off</Badge>
                  </div>
                </div>
                <p className="text-sm text-ink-500">Billed $200/year + priority support.</p>
              </div>
              <div className="mt-8 space-y-4">
                <div className="flex items-end gap-0.5 text-xl text-ink-400">
                  <span>$</span>
                  <span className="-mb-0.5 text-4xl font-extrabold tracking-tighter text-ink md:text-5xl">17</span>
                  <span>/month</span>
                </div>
                <Button className="w-full" asChild>
                  <a href="/sign-up">Get started</a>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-x-2 text-sm text-ink-500">
            <ShieldCheckIcon className="size-4" />
            <span>All features included — no hidden fees</span>
          </div>
        </div>
      </div>

      {/* Feature comparison */}
      <div className="mt-20 grid gap-8 sm:grid-cols-2">
        <FeatureColumn
          title="Free"
          subtitle="Everything you need to start hiring."
          features={FREE_FEATURES}
          variant="default"
        />
        <FeatureColumn
          title="Pro"
          subtitle="Unlock the full platform."
          features={PRO_FEATURES}
          variant="pro"
          annualNote="Annual plan includes priority support."
        />
      </div>
    </Section>
  );
}

function FeatureColumn({
  title,
  subtitle,
  features,
  variant,
  annualNote,
}: {
  title: string;
  subtitle: string;
  features: string[];
  variant: 'default' | 'pro';
  annualNote?: string;
}) {
  return (
    <div className={cn('rounded-lg border p-6', variant === 'pro' && 'border-primary/30 bg-primary/5')}>
      <div className="mb-5">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
      </div>
      <ul className="space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2.5 text-sm text-ink-600">
            <Check
              className={cn(
                'size-4 shrink-0',
                variant === 'pro' ? 'text-primary' : 'text-ink-400',
              )}
            />
            {feature}
          </li>
        ))}
        {annualNote && (
          <li className="flex items-center gap-2.5 text-sm text-ink-500">
            <Star className="size-4 shrink-0 text-amber-500" />
            {annualNote}
          </li>
        )}
      </ul>
    </div>
  );
}
