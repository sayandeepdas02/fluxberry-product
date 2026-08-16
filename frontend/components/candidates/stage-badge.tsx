import type { ApplicationStage } from '@fluxberry/shared';
import { Badge } from '@/components/ui/badge';
import { STAGE_LABELS } from '@/lib/labels';

const VARIANT: Record<ApplicationStage, 'muted' | 'primary' | 'warning' | 'success' | 'destructive'> = {
  APPLIED: 'muted',
  SCREENING: 'primary',
  ASSESSMENT: 'primary',
  INTERVIEW: 'warning',
  OFFER: 'success',
  HIRED: 'success',
  REJECTED: 'destructive',
};

export function StageBadge({ stage }: { stage: ApplicationStage }) {
  return <Badge variant={VARIANT[stage]}>{STAGE_LABELS[stage]}</Badge>;
}
