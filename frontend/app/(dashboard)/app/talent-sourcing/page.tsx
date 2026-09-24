'use client';

import { UserSearch } from 'lucide-react';
import { FeatureGate } from '@/components/billing/feature-gate';

export default function TalentSourcingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-page-title">Talent Sourcing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find and reach out to candidates beyond your inbound applicants.
        </p>
      </div>

      {/* Non-Max plans see the upgrade upsell here; Max users see the placeholder
          below until the sourcing feature ships. */}
      <FeatureGate feature="TALENT_SOURCING">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserSearch className="size-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Talent Sourcing is coming soon</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Outbound sourcing is included in your Max plan and is launching shortly. We&apos;ll let you know the
            moment it&apos;s ready.
          </p>
        </div>
      </FeatureGate>
    </div>
  );
}
