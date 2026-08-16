'use client';

import { format } from 'date-fns';
import type { TimelineEntryDto, ApplicationStage } from '@fluxberry/shared';
import { STAGE_LABELS } from '@/lib/labels';

function describe(e: TimelineEntryDto): string {
  const m = (e.metadata ?? {}) as Record<string, any>;
  switch (e.type) {
    case 'application.created':
      return 'Applied';
    case 'resume.processing.completed':
      return 'Resume parsed';
    case 'resume.processing.failed':
      return 'Resume parsing failed';
    case 'screening.completed':
      return `AI screening completed${m.score != null ? ` · ${m.score}/10` : ''}`;
    case 'candidate.shortlisted':
      return 'Shortlisted';
    case 'candidate.rejected':
      return 'Rejected';
    case 'candidate.hired':
      return 'Hired';
    case 'candidate.stage.changed':
      return m.to ? `Moved to ${STAGE_LABELS[m.to as ApplicationStage] ?? m.to}` : 'Stage changed';
    case 'assessment.sent':
      return 'Assessment sent';
    case 'assessment.completed':
      return `Assessment completed${m.score != null ? ` · ${m.score}%` : ''}`;
    case 'interview.completed':
      return 'Interview completed';
    default:
      return e.type;
  }
}

// Intermediate "started" events are noise on the timeline — show only milestones.
const HIDDEN = new Set(['resume.processing.started', 'screening.started', 'application.started']);

export function Timeline({ entries }: { entries: TimelineEntryDto[] }) {
  const visible = entries.filter((e) => !HIDDEN.has(e.type));
  if (!visible.length) return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {visible.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[23px] top-1 size-2.5 rounded-full border-2 border-background bg-primary" />
          <div className="text-sm font-medium text-foreground">{describe(e)}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(e.createdAt), 'MMM d, yyyy · h:mm a')}
            {e.actor && e.actor !== 'system' ? ` · ${e.actor}` : ''}
          </div>
        </li>
      ))}
    </ol>
  );
}
