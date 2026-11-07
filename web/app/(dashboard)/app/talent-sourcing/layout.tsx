'use client';

import { FeatureGate } from '@/components/billing/feature-gate';
import { SourcingNav } from '@/components/talent-sourcing/sourcing-nav';

export default function TalentSourcingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Talent Sourcing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find and reach out to candidates beyond your inbound applicants.
        </p>
      </div>

      <FeatureGate feature="TALENT_SOURCING">
        <div className="space-y-6">
          <SourcingNav />
          {children}
        </div>
      </FeatureGate>
    </div>
  );
}
