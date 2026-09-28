'use client';

import type { SolutionVisualKind } from '../content';
import { AnalyticsVisual } from './analytics';
import { CollaborationVisual } from './collaboration';
import { DashboardVisual } from './dashboard';
import { IntegrationsVisual } from './integrations';
import { ScreeningVisual } from './screening';
import { SecurityVisual } from './security';

const VISUALS = {
  dashboard: DashboardVisual,
  collaboration: CollaborationVisual,
  screening: ScreeningVisual,
  analytics: AnalyticsVisual,
  security: SecurityVisual,
  integrations: IntegrationsVisual,
} satisfies Record<SolutionVisualKind, () => React.ReactNode>;

/** The animated mockup for one Solutions card. */
export function SolutionVisual({ kind }: { kind: SolutionVisualKind }) {
  const Visual = VISUALS[kind];
  return <Visual />;
}
