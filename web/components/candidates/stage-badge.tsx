import type { ApplicationStage, PipelineStage } from '@/lib/shared';
import { Badge } from '@/components/ui/badge';
import { stageLabel } from '@/lib/labels';

const VARIANT: Record<ApplicationStage, 'muted' | 'primary' | 'warning' | 'success' | 'destructive'> = {
  APPLIED: 'muted',
  SCREENING: 'primary',
  OFFER: 'success',
  HIRED: 'success',
  REJECTED: 'destructive',
};

function isSystemStage(id: string): id is ApplicationStage {
  return id in VARIANT;
}

/** `stages` is the job's effective stage list, when known — resolves custom labels/colors. */
export function StageBadge({ stage, stages }: { stage: string; stages?: PipelineStage[] }) {
  const custom = stages?.find((s) => s.id === stage);
  const variant = isSystemStage(stage) ? VARIANT[stage] : custom?.terminal ? 'destructive' : 'muted';
  return <Badge variant={variant}>{stageLabel(stages, stage)}</Badge>;
}
