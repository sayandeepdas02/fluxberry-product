'use client';

import { Check, Clock, X, Minus } from 'lucide-react';
import type { WorkflowNodeType, WorkflowStepStatus } from '@/lib/shared';
import { useWorkflowRun } from '@/hooks/use-workflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const NODE_LABELS: Record<WorkflowNodeType, string> = {
  APPLICATION_RECEIVED: 'Application received',
  AI_SCREEN: 'AI screening',
  CONDITION: 'Condition',
  SEND_ASSESSMENT: 'Send assessment',
  WAIT: 'Wait',
  MOVE_STAGE: 'Move stage',
  SEND_EMAIL: 'Send email',
  CODING_ASSESSMENT: 'Coding assessment',
  AI_INTERVIEW: 'AI interview',
};

function StepIcon({ status }: { status: WorkflowStepStatus }) {
  if (status === 'COMPLETED') return <Check className="size-3.5 text-success" />;
  if (status === 'FAILED') return <X className="size-3.5 text-destructive" />;
  if (status === 'SKIPPED') return <Minus className="size-3.5 text-muted-foreground" />;
  return <Clock className="size-3.5 text-muted-foreground" />;
}

export function WorkflowRunCard({ applicationId }: { applicationId: string }) {
  const { data: run } = useWorkflowRun(applicationId);
  if (!run) return null;

  const statusVariant =
    run.status === 'COMPLETED' ? 'success'
    : run.status === 'FAILED' ? 'destructive'
    : run.status === 'WAITING' ? 'warning'
    : 'primary';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Workflow</CardTitle>
        <Badge variant={statusVariant as any}>{run.status.toLowerCase()}</Badge>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {run.steps.length === 0 && <p className="text-sm text-muted-foreground">Waiting to start…</p>}
        {run.steps.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5 text-sm">
            <StepIcon status={s.status} />
            <span className="text-foreground">{s.nodeType ? NODE_LABELS[s.nodeType] : 'Step'}</span>
            {s.output && typeof (s.output as any).result === 'boolean' && (
              <span className="text-xs text-muted-foreground">{(s.output as any).result ? '· passed' : '· stopped'}</span>
            )}
          </div>
        ))}
        {run.status === 'WAITING' && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" /> Waiting…
          </div>
        )}
        {run.status === 'FAILED' && Boolean(run.context?.error) && (
          <p className="text-xs text-destructive">{String(run.context?.error)}</p>
        )}
      </CardContent>
    </Card>
  );
}
