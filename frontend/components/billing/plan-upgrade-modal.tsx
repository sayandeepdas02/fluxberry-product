'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { FeatureFlag } from '@/lib/shared';
import { requiredPlanForFeature } from '@/lib/shared';
import { FEATURE_FLAG_LABELS } from '@/lib/labels';
import { PLAN_LABELS } from '@/lib/pricing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PlanUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which feature triggered the prompt, if known — shapes the copy. Pass the value from getPlanUpgradeFlag(err). */
  flag?: FeatureFlag | string;
}

/**
 * The standard upsell surface for any plan-gated feature. Catch a
 * PLAN_UPGRADE_REQUIRED error (see getPlanUpgradeFlag in lib/api-client.ts) in
 * a mutation's onError, then render this instead of a plain error toast:
 *
 *   onError: (err) => {
 *     const flag = getPlanUpgradeFlag(err);
 *     if (flag) { setUpgradeFlag(flag); setUpgradeOpen(true); return; }
 *     toast.error(err instanceof Error ? err.message : 'Something went wrong');
 *   }
 */
export function PlanUpgradeModal({ open, onOpenChange, flag }: PlanUpgradeModalProps) {
  const featureName = flag && flag in FEATURE_FLAG_LABELS ? FEATURE_FLAG_LABELS[flag as FeatureFlag] : 'This feature';
  const requiredPlan = flag && flag in FEATURE_FLAG_LABELS ? requiredPlanForFeature(flag as FeatureFlag) : null;
  const planName = requiredPlan && requiredPlan !== 'FREE' ? PLAN_LABELS[requiredPlan] : 'a paid';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle className="pt-2">Upgrade to unlock {featureName.toLowerCase()}</DialogTitle>
          <DialogDescription>
            {featureName} is available on the {planName} plan. Upgrade your workspace to turn it on.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button asChild>
            <Link href="/app/pricing" onClick={() => onOpenChange(false)}>
              View plans
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
