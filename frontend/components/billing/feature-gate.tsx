'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { FeatureFlag } from '@/lib/shared';
import { requiredPlanForFeature } from '@/lib/shared';
import { FEATURE_FLAG_LABELS } from '@/lib/labels';
import { PLAN_LABELS } from '@/lib/pricing';
import { useBillingStatus } from '@/hooks/use-billing';
import { PageSpinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

/**
 * Full-page gate for a plan-gated feature: renders `children` when the account's
 * plan unlocks the feature, otherwise a centered upsell that names the required
 * plan and links to billing. Use this to wrap the body of a Max-only page (the
 * API also enforces the gate, so this is UX, not security).
 */
export function FeatureGate({ feature, children }: { feature: FeatureFlag; children: React.ReactNode }) {
  const { data, isLoading } = useBillingStatus();

  if (isLoading) return <PageSpinner label="Loading…" />;
  if (data?.enabledFeatures.includes(feature)) return <>{children}</>;

  const requiredPlan = requiredPlanForFeature(feature);
  const planName = requiredPlan && requiredPlan !== 'FREE' ? PLAN_LABELS[requiredPlan] : 'a paid';
  const featureName = feature in FEATURE_FLAG_LABELS ? FEATURE_FLAG_LABELS[feature] : 'This feature';

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="size-5" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{featureName} is a {planName} feature</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Upgrade your plan to {planName} to unlock {featureName.toLowerCase()}.
      </p>
      <Button asChild className="mt-2">
        <Link href="/app/settings/billing">View plans</Link>
      </Button>
    </div>
  );
}
