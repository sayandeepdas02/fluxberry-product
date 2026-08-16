'use client';

import { useRouter } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { formatDistanceToNow } from 'date-fns';
import type { ApplicationStage, CandidateListItemDto } from '@fluxberry/shared';
import { PIPELINE_STAGES } from '@fluxberry/shared';
import { ScoreBadge } from './score-badge';
import { STAGE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

const COLUMNS: ApplicationStage[] = [...PIPELINE_STAGES, 'REJECTED'];

export function CandidateBoard({
  items,
  onMove,
}: {
  items: CandidateListItemDto[];
  onMove: (applicationId: string, stage: ApplicationStage) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byStage = (stage: ApplicationStage) => items.filter((i) => i.stage === stage);

  const onDragEnd = (e: DragEndEvent) => {
    const overStage = e.over?.id as ApplicationStage | undefined;
    const fromStage = e.active.data.current?.stage as ApplicationStage | undefined;
    if (overStage && fromStage && overStage !== fromStage) {
      onMove(String(e.active.id), overStage);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((stage) => (
          <Column key={stage} stage={stage} items={byStage(stage)} />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ stage, items }: { stage: ApplicationStage; items: CandidateListItemDto[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-xl border border-border bg-muted/30 p-2 transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between px-1.5 py-1.5">
        <span className="text-sm font-medium">{STAGE_LABELS[stage]}</span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((c) => (
          <CandidateCard key={c.applicationId} item={c} />
        ))}
      </div>
    </div>
  );
}

function CandidateCard({ item }: { item: CandidateListItemDto }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.applicationId,
    data: { stage: item.stage },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => router.push(`/app/candidates/${item.candidateId}`)}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        'cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{item.name}</div>
          <div className="truncate text-xs text-muted-foreground">{item.jobTitle}</div>
        </div>
        <ScoreBadge score={item.score} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{item.location ?? '—'}</span>
        <span>{formatDistanceToNow(new Date(item.appliedAt), { addSuffix: true })}</span>
      </div>
    </div>
  );
}
