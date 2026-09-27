'use client';

import { Check, Minus, Sparkles } from 'lucide-react';
import type { ScreeningResultDto } from '@/lib/shared';
import { SCORE_DIMENSION_LABELS, SCORE_DIMENSIONS } from '@/lib/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { CostLabel } from '@/components/billing/cost-label';
import { cn } from '@/lib/utils';

export function ScreeningCard({
  screening,
  onRetry,
  retrying,
}: {
  screening?: ScreeningResultDto | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const status = screening?.status ?? 'PENDING';

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <CardTitle>AI screening</CardTitle>
        {status === 'COMPLETED' && onRetry && (
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={onRetry} loading={retrying}>
            Re-screen <CostLabel action="APPLICANT_SCREENING" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {status === 'AWAITING_CREDITS' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              AI screening is paused for this applicant: your plan&apos;s included screenings for this period are used
              up and there are no AI credits left. The application itself was received normally.
            </p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} loading={retrying}>
                Screen now <CostLabel action="APPLICANT_SCREENING" />
              </Button>
            )}
          </div>
        ) : status === 'PENDING' || status === 'PROCESSING' ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Analyzing candidate…
          </div>
        ) : status === 'FAILED' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Screening unavailable.</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} loading={retrying}>
                Retry
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">{screening?.score?.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>

            {screening?.summary && <p className="text-sm text-muted-foreground">{screening.summary}</p>}

            {screening?.breakdown && (
              <div className="space-y-1.5">
                {SCORE_DIMENSIONS.map((dim) => {
                  const v = (screening.breakdown as any)?.[dim] ?? 0;
                  return (
                    <div key={dim} className="flex items-center gap-3 text-xs">
                      <span className="w-28 shrink-0 text-muted-foreground">{SCORE_DIMENSION_LABELS[dim]}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full rounded-full bg-primary')} style={{ width: `${(v / 10) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right tabular-nums text-muted-foreground">{Number(v).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {!!screening?.strengths?.length && (
              <div>
                <div className="mb-1.5 text-xs font-medium text-foreground">Strong matches</div>
                <ul className="space-y-1">
                  {screening.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!screening?.concerns?.length && (
              <div>
                <div className="mb-1.5 text-xs font-medium text-foreground">Potential gaps</div>
                <ul className="space-y-1">
                  {screening.concerns.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Minus className="mt-0.5 size-3.5 shrink-0 text-warning" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground/70">
              AI recommendations assist your decision — they don&apos;t replace it.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
