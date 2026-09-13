'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  AlignLeft,
  Hash,
  List,
  ChevronDown,
  ListChecks,
  Phone,
  Linkedin,
  Twitter,
  Instagram,
  Github,
  Youtube,
  Link2,
  Calendar,
  Paperclip,
  Video,
  ToggleLeft,
  X,
} from 'lucide-react';
import {
  type FormQuestion,
  type FormQuestionType,
  type MultipleChoiceVariant,
  type OtherLinkPlatform,
} from '@fluxberry/shared';
import { useApplicationForm, useUpdateForm } from '@/hooks/use-form';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const OTHER_LINK_LABELS: Record<OtherLinkPlatform, string> = {
  TWITTER: 'X (Twitter)',
  INSTAGRAM: 'Instagram',
  GITHUB: 'Github',
  YOUTUBE: 'YouTube video',
  ANY: 'Any link',
};

const OTHER_LINK_ICONS: Record<OtherLinkPlatform, React.ReactNode> = {
  TWITTER: <Twitter className="size-4" />,
  INSTAGRAM: <Instagram className="size-4" />,
  GITHUB: <Github className="size-4" />,
  YOUTUBE: <Youtube className="size-4" />,
  ANY: <Link2 className="size-4" />,
};

const OTHER_LINK_PLACEHOLDERS: Record<OtherLinkPlatform, string> = {
  TWITTER: 'x.com/username',
  INSTAGRAM: 'instagram.com/username',
  GITHUB: 'github.com/username',
  YOUTUBE: 'youtube.com/watch?v=…',
  ANY: 'https://…',
};

export default function JobFormBuilderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: form, isLoading } = useApplicationForm(jobId);
  const updateForm = useUpdateForm(jobId);

  const [questions, setQuestions] = useState<FormQuestion[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (form && !questions) setQuestions(form.questions);
  }, [form, questions]);

  // Global ⌘K / Ctrl+K opens the add-question menu, matching the shortcut hint on the button.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMenuOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (isLoading || !questions) return <Skeleton className="mx-auto h-96 max-w-2xl" />;

  const systemFields = questions.filter((q) => q.system);
  const customFields = questions.filter((q) => !q.system);

  const patch = (id: string, changes: Partial<FormQuestion>) => {
    setQuestions((qs) => qs!.map((q) => (q.id === id ? { ...q, ...changes } : q)));
    setDirty(true);
  };

  const removeQuestion = (id: string) => {
    setQuestions((qs) => qs!.filter((q) => q.id !== id));
    setDirty(true);
  };

  const addQuestion = (q: FormQuestion) => {
    setQuestions((qs) => [...qs!, q]);
    setDirty(true);
  };

  const reorderCustom = (activeId: string, overId: string) => {
    const fromIdx = customFields.findIndex((q) => q.id === activeId);
    const toIdx = customFields.findIndex((q) => q.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = arrayMove(customFields, fromIdx, toIdx);
    setQuestions([...systemFields, ...reordered]);
    setDirty(true);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const overId = e.over?.id;
    if (!overId || e.active.id === overId) return;
    reorderCustom(String(e.active.id), String(overId));
  };

  const save = async () => {
    try {
      const ordered = questions.map((q, i) => ({ ...q, sortOrder: i }));
      await updateForm.mutateAsync(ordered);
      setDirty(false);
      toast.success('Your changes are saved and visible to new applicants');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save form');
    }
  };

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <h2 className="text-xl font-semibold tracking-tight">Application form</h2>
        <p className="mt-1 text-sm text-muted-foreground">This is exactly what candidates see and fill out.</p>

        <div className="mt-8 space-y-6">
          {systemFields.map((q) => (
            <FieldRow key={q.id} q={q} onPatch={(c) => patch(q.id, c)} />
          ))}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={customFields.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {customFields.map((q) => (
                  <SortableFieldRow
                    key={q.id}
                    q={q}
                    onPatch={(c) => patch(q.id, c)}
                    onRemove={() => removeQuestion(q.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-8 flex justify-center">
          <AddQuestionMenu open={menuOpen} onOpenChange={setMenuOpen} onAdd={addQuestion} />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={save} loading={updateForm.isPending} disabled={!dirty}>
          Save form
        </Button>
      </div>
    </div>
  );
}

function SortableFieldRow({
  q,
  onPatch,
  onRemove,
}: {
  q: FormQuestion;
  onPatch: (c: Partial<FormQuestion>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'z-10 opacity-90')}
    >
      <FieldRow
        q={q}
        onPatch={onPatch}
        onRemove={onRemove}
        dragHandle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

function FieldRow({
  q,
  onPatch,
  onRemove,
  dragHandle,
}: {
  q: FormQuestion;
  onPatch: (c: Partial<FormQuestion>) => void;
  onRemove?: () => void;
  dragHandle?: React.ReactNode;
}) {
  return (
    <div className="group relative rounded-lg -mx-3 px-3 py-1.5 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-2">
        {dragHandle && <div className="mt-2.5 shrink-0">{dragHandle}</div>}
        <div className="min-w-0 flex-1">
          <QuestionLabel q={q} onPatch={onPatch} />
          <div className="mt-2">
            <QuestionInputPreview q={q} onPatch={onPatch} />
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Required
          <Switch checked={q.required} onCheckedChange={(v) => onPatch({ required: v })} disabled={q.system && !q.enabled} />
        </label>
        {q.system && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Enabled
            <Switch checked={q.enabled} onCheckedChange={(v) => onPatch({ enabled: v })} />
          </label>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground/60 hover:text-destructive"
            aria-label="Delete question"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionLabel({ q, onPatch }: { q: FormQuestion; onPatch: (c: Partial<FormQuestion>) => void }) {
  if (q.system) {
    return (
      <div className="text-sm font-semibold">
        {q.label} {q.required && <span className="text-destructive">*</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-sm font-semibold">
      <input
        value={q.label}
        onChange={(e) => onPatch({ label: e.target.value })}
        placeholder="Question"
        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 -mx-1 outline-none hover:border-input focus:border-input focus:bg-background"
      />
      {q.required && <span className="text-destructive">*</span>}
    </div>
  );
}

/** Decorative (mostly non-interactive) preview of what this question looks like on the live form. */
function QuestionInputPreview({ q, onPatch }: { q: FormQuestion; onPatch: (c: Partial<FormQuestion>) => void }) {
  const baseInput =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-muted-foreground/70 pointer-events-none';

  switch (q.type) {
    case 'LONG_TEXT':
      return <div className={cn(baseInput, 'h-20 pt-2')} />;
    case 'NUMBER':
      return <div className={baseInput} />;
    case 'PHONE':
      return <div className={baseInput}>+1 (555) 000-0000</div>;
    case 'LINKEDIN':
      return <div className={baseInput}>linkedin.com/in/username</div>;
    case 'OTHER_LINK':
      return <div className={baseInput}>{OTHER_LINK_PLACEHOLDERS[q.linkPlatform ?? 'ANY']}</div>;
    case 'DATE':
      return (
        <div className={cn(baseInput, 'flex items-center gap-2')}>
          <Calendar className="size-4" /> Select a date
        </div>
      );
    case 'FILE_UPLOAD':
      return (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-2.5 text-sm text-muted-foreground/70">
          <Paperclip className="size-4" /> Upload a file
        </div>
      );
    case 'VIDEO_RECORDING':
      return (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-2.5 text-sm text-muted-foreground/70">
          <Video className="size-4" /> Record or upload a video
        </div>
      );
    case 'YES_NO':
      return (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <label className="flex items-center gap-1.5"><input type="radio" disabled /> Yes</label>
          <label className="flex items-center gap-1.5"><input type="radio" disabled /> No</label>
        </div>
      );
    case 'MULTIPLE_CHOICE':
      return <MultipleChoicePreview q={q} onPatch={onPatch} />;
    case 'SHORT_TEXT':
    default:
      return <div className={baseInput} />;
  }
}

function MultipleChoicePreview({ q, onPatch }: { q: FormQuestion; onPatch: (c: Partial<FormQuestion>) => void }) {
  const variant: MultipleChoiceVariant = q.variant ?? 'LIST';
  const options = q.options.length ? q.options : [];

  const setOptionLabel = (id: string, label: string) => {
    onPatch({ options: q.options.map((o) => (o.id === id ? { ...o, label } : o)) });
  };
  const removeOption = (id: string) => {
    onPatch({ options: q.options.filter((o) => o.id !== id) });
  };
  const addOption = () => {
    onPatch({ options: [...q.options, { id: uid(), label: `Option ${q.options.length + 1}` }] });
  };

  if (variant === 'DROPDOWN') {
    return (
      <div className="space-y-2">
        <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-muted-foreground/70">
          Select an option <ChevronDown className="size-4" />
        </div>
        <OptionEditor options={options} onChangeLabel={setOptionLabel} onRemove={removeOption} onAdd={addOption} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center gap-2">
          {variant === 'MULTI_SELECT' ? (
            <input type="checkbox" disabled className="size-4" />
          ) : (
            <input type="radio" disabled className="size-4" />
          )}
          <input
            value={opt.label}
            onChange={(e) => setOptionLabel(opt.id, e.target.value)}
            className="h-8 flex-1 rounded border border-transparent bg-transparent px-1.5 text-sm outline-none hover:border-input focus:border-input focus:bg-background"
          />
          <button type="button" onClick={() => removeOption(opt.id)} className="text-muted-foreground/50 hover:text-destructive">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addOption} className="flex items-center gap-1.5 pl-6 text-xs font-medium text-muted-foreground hover:text-foreground">
        <Plus className="size-3.5" /> Add option
      </button>
    </div>
  );
}

function OptionEditor({
  options,
  onChangeLabel,
  onRemove,
  onAdd,
}: {
  options: FormQuestion['options'];
  onChangeLabel: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-1.5 pl-1">
      {options.map((opt) => (
        <div key={opt.id} className="flex items-center gap-2">
          <input
            value={opt.label}
            onChange={(e) => onChangeLabel(opt.id, e.target.value)}
            className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm outline-none"
          />
          <button type="button" onClick={() => onRemove(opt.id)} className="text-muted-foreground/50 hover:text-destructive">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <Plus className="size-3.5" /> Add option
      </button>
    </div>
  );
}

function newQuestion(overrides: Partial<FormQuestion> & { type: FormQuestionType; label: string }): FormQuestion {
  return {
    id: uid(),
    required: false,
    enabled: true,
    options: [],
    sortOrder: 0,
    system: false,
    ...overrides,
  };
}

function AddQuestionMenu({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (q: FormQuestion) => void;
}) {
  const add = (q: FormQuestion) => {
    onAdd(q);
    onOpenChange(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
        >
          <Plus className="size-4" /> Add new question
          <span className="ml-2 flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <kbd className="rounded border border-border bg-background px-1">⌘</kbd>
            <kbd className="rounded border border-border bg-background px-1">K</kbd>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuItem onSelect={() => add(newQuestion({ type: 'SHORT_TEXT', label: 'Question' }))}>
          <Type className="size-4" /> Short answer
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => add(newQuestion({ type: 'LONG_TEXT', label: 'Question' }))}>
          <AlignLeft className="size-4" /> Long answer
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => add(newQuestion({ type: 'NUMBER', label: 'Question' }))}>
          <Hash className="size-4" /> Number
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <List className="size-4" /> Multiple choice
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onSelect={() =>
                add(
                  newQuestion({
                    type: 'MULTIPLE_CHOICE',
                    label: 'Question',
                    variant: 'LIST',
                    options: [{ id: uid(), label: 'Option 1' }, { id: uid(), label: 'Option 2' }],
                  }),
                )
              }
            >
              <List className="size-4" /> List
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                add(
                  newQuestion({
                    type: 'MULTIPLE_CHOICE',
                    label: 'Question',
                    variant: 'DROPDOWN',
                    options: [{ id: uid(), label: 'Option 1' }, { id: uid(), label: 'Option 2' }],
                  }),
                )
              }
            >
              <ChevronDown className="size-4" /> Dropdown
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                add(
                  newQuestion({
                    type: 'MULTIPLE_CHOICE',
                    label: 'Question',
                    variant: 'MULTI_SELECT',
                    options: [{ id: uid(), label: 'Option 1' }, { id: uid(), label: 'Option 2' }],
                  }),
                )
              }
            >
              <ListChecks className="size-4" /> Multi-select
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => add(newQuestion({ type: 'PHONE', label: 'Phone number' }))}>
          <Phone className="size-4" /> Phone
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => add(newQuestion({ type: 'LINKEDIN', label: 'LinkedIn profile' }))}>
          <Linkedin className="size-4" /> LinkedIn profile
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Twitter className="size-4" /> Other links
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(Object.keys(OTHER_LINK_LABELS) as OtherLinkPlatform[]).map((platform) => (
              <DropdownMenuItem
                key={platform}
                onSelect={() =>
                  add(newQuestion({ type: 'OTHER_LINK', label: OTHER_LINK_LABELS[platform], linkPlatform: platform }))
                }
              >
                {OTHER_LINK_ICONS[platform]} {OTHER_LINK_LABELS[platform]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => add(newQuestion({ type: 'DATE', label: 'Date' }))}>
          <Calendar className="size-4" /> Date
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => add(newQuestion({ type: 'FILE_UPLOAD', label: 'Upload a file' }))}>
          <Paperclip className="size-4" /> File upload
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => add(newQuestion({ type: 'VIDEO_RECORDING', label: 'Record a video' }))}>
          <Video className="size-4" /> Video recording
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Re-exported so the legacy YES_NO icon (still valid for old data) is available if ever surfaced elsewhere.
export const LEGACY_YES_NO_ICON = <ToggleLeft className="size-4" />;
