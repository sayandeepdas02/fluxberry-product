'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { formatDistanceToNow } from 'date-fns';
import type { CandidateListItemDto, PipelineStage } from '@/lib/shared';
import { ScoreBadge } from './score-badge';
import { cn } from '@/lib/utils';

/**
 * The column under the pointer wins. dnd-kit's default compares the card's
 * rectangle instead, so near a column edge a drop could land somewhere other
 * than under the cursor (often back in its own column, a silent no-op). Falls
 * back to the most-overlapped column between columns and for keyboard drags.
 */
const columnUnderPointer: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

/** Left/right arrows carry a keyboard-dragged card to the neighbouring column. */
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const step = event.code === KeyboardCode.Right ? 1 : event.code === KeyboardCode.Left ? -1 : 0;
  const { active, collisionRect, droppableRects, droppableContainers, over } = context;
  if (!step || !active || !collisionRect) return undefined;
  event.preventDefault();

  const columns = droppableContainers
    .getEnabled()
    .flatMap((column) => {
      const rect = droppableRects.get(column.id);
      return rect ? [{ id: column.id, rect }] : [];
    })
    .sort((a, b) => a.rect.left - b.rect.left);
  const current = columns.findIndex((column) => column.id === (over?.id ?? active.data.current?.stage));
  const target = columns[current + step];
  if (!target) return undefined;
  // Coordinates are the dragged card's top-left: centre it in the target column.
  return { x: target.rect.left + (target.rect.width - collisionRect.width) / 2, y: collisionRect.top };
};

/** Space picks a card up and drops it; Enter is left free to open the candidate. */
const KEYBOARD_CODES = {
  start: [KeyboardCode.Space],
  cancel: [KeyboardCode.Esc],
  end: [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Tab],
};

const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    'To move this candidate, press Space, choose a stage with the left and right arrow keys, then press Space to drop or Escape to cancel. Press Enter to open the candidate.',
};

const CARD_CLASS = 'rounded-lg border border-border bg-card p-3 text-left shadow-sm';

export function CandidateBoard({
  items,
  stages,
  onMove,
}: {
  items: CandidateListItemDto[];
  /** Ordered column list — the job's custom stages, or the 7 system defaults. */
  stages: PipelineStage[];
  /**
   * Called when a card is dropped on a different column. Return the save's
   * promise to keep the card in its new column while it saves; once it
   * settles the board shows the server's data again, which puts the card back
   * if the save failed. Return nothing to leave the card where it was (e.g.
   * when the move needs a dialog first).
   */
  onMove: (applicationId: string, stage: string) => Promise<unknown> | void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch waits for a short press, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates, keyboardCodes: KEYBOARD_CODES }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  // Moves still saving, laid over the server data so a dropped card stays in
  // the column it was dropped on until the refetched list agrees.
  const [pending, setPending] = useState<Record<string, string>>({});

  const stageOf = (item: CandidateListItemDto) => pending[item.applicationId] ?? item.stage;
  const find = (id: UniqueIdentifier) => items.find((i) => i.applicationId === String(id));
  const nameOf = (id: UniqueIdentifier) => find(id)?.name ?? 'Candidate';
  const labelOf = (id: UniqueIdentifier) => stages.find((s) => s.id === String(id))?.label ?? String(id);
  const activeItem = activeId ? find(activeId) : undefined;
  const sourceStage = activeItem ? stageOf(activeItem) : undefined;

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const id = String(active.id);
    const item = find(id);
    const to = over ? String(over.id) : undefined;
    if (!item || !to || to === stageOf(item)) return;

    const saving = onMove(id, to);
    if (!saving) return;
    setPending((p) => ({ ...p, [id]: to }));
    const settle = () =>
      setPending((p) => {
        // A newer drop of the same card owns the override now.
        if (p[id] !== to) return p;
        const rest = { ...p };
        delete rest[id];
        return rest;
      });
    saving.then(settle, settle);
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} is over ${labelOf(over.id)}.` : `${nameOf(active.id)} is not over a stage.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} dropped on ${labelOf(over.id)}.` : `${nameOf(active.id)} was not moved.`,
    onDragCancel: ({ active }) => `Cancelled. ${nameOf(active.id)} was not moved.`,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={columnUnderPointer}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            items={items.filter((i) => stageOf(i) === stage.id)}
            stageOf={stageOf}
            isSource={stage.id === sourceStage}
          />
        ))}
      </div>
      {/* The card that follows the pointer floats above the board, so the
          board's horizontal scroll can't clip it. */}
      <DragOverlay>
        {activeItem ? (
          <div className={cn(CARD_CLASS, 'rotate-[1.5deg] cursor-grabbing shadow-lg ring-1 ring-primary/20')}>
            <CardContent item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  stage,
  items,
  stageOf,
  isSource,
}: {
  stage: PipelineStage;
  items: CandidateListItemDto[];
  stageOf: (item: CandidateListItemDto) => string;
  /** The column the dragged card came from: dropping back there changes nothing. */
  isSource: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-xl border border-border bg-muted/30 p-2 transition-colors',
        isOver && !isSource && 'border-primary/60 bg-primary/5 ring-2 ring-primary/15',
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
          <CandidateCard key={c.applicationId} item={c} stage={stageOf(c)} />
        ))}
      </div>
    </div>
  );
}

function CandidateCard({ item, stage }: { item: CandidateListItemDto; stage: string }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.applicationId,
    data: { stage },
  });
  const open = () => router.push(`/app/candidates/${item.candidateId}`);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isDragging) {
          e.preventDefault();
          open();
          return;
        }
        listeners?.onKeyDown?.(e);
      }}
      className={cn(
        CARD_CLASS,
        'cursor-grab select-none transition-shadow hover:shadow',
        // While it's being dragged, the card stays behind as a faded placeholder.
        isDragging && 'opacity-40',
      )}
    >
      <CardContent item={item} />
    </div>
  );
}

function CardContent({ item }: { item: CandidateListItemDto }) {
  return (
    <>
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
    </>
  );
}
