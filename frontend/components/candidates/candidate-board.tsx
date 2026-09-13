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
import type { CandidateListItemDto, PipelineStage } from '@fluxberry/shared';
import { ScoreBadge } from './score-badge';
import { cn } from '@/lib/utils';

export function CandidateBoard({
  items,
  stages,
  onMove,
}: {
  items: CandidateListItemDto[];
  /** Ordered column list — the job's custom stages, or the 7 system defaults. */
  stages: PipelineStage[];
  onMove: (applicationId: string, stage: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byStage = (stage: string) => items.filter((i) => i.stage === stage);

  const onDragEnd = (e: DragEndEvent) => {
    const overStage = e.over?.id as string | undefined;
    const fromStage = e.active.data.current?.stage as string | undefined;
    if (overStage && fromStage && overStage !== fromStage) {
      onMove(String(e.active.id), overStage);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Column key={stage.id} stage={stage} items={byStage(stage.id)} />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ stage, items }: { stage: PipelineStage; items: CandidateListItemDto[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-xl border border-border bg-muted/30 p-2 transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between px-1.5 py-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {stage.color && <span className="size-2 rounded-full" style={{ backgroundColor: stage.color }} />}
          {stage.label}
        </span>
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
