import { cn } from '@/lib/utils';

/** Compact AI score chip, colored by band (spec §105 ScoreBadge). */
export function ScoreBadge({ score, className }: { score?: number | null; className?: string }) {
  if (score == null) {
    return <span className={cn('text-sm text-muted-foreground', className)}>—</span>;
  }
  const band =
    score >= 8 ? 'bg-success/10 text-success'
    : score >= 6 ? 'bg-primary/10 text-primary'
    : score >= 4 ? 'bg-warning/10 text-[hsl(32_80%_38%)]'
    : 'bg-muted text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-sm font-semibold tabular-nums', band, className)}>
      {score.toFixed(1)}
    </span>
  );
}
