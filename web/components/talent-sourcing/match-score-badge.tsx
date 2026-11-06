import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Transparent 0–100 fit score, coloured by band. Reasons surface on hover. */
export function MatchScoreBadge({
  score,
  reasons,
  className,
}: {
  score: number;
  reasons?: string[];
  className?: string;
}) {
  const variant = score >= 80 ? 'success' : score >= 60 ? 'primary' : 'muted';
  return (
    <Badge
      variant={variant}
      className={cn('font-mono tabular-nums', className)}
      title={reasons?.length ? reasons.join('\n') : undefined}
    >
      {score}
    </Badge>
  );
}
