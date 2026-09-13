'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Type, AlignLeft, Hash, List, ToggleLeft, Paperclip } from 'lucide-react';
import {
  FORM_QUESTION_TYPES,
  type FormQuestion,
  type FormQuestionType,
} from '@fluxberry/shared';
import { useApplicationForm, useUpdateForm } from '@/hooks/use-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { FORM_QUESTION_TYPE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

const FORM_QUESTION_TYPE_ICONS: Record<FormQuestionType, React.ReactNode> = {
  SHORT_TEXT: <Type className="size-4" />,
  LONG_TEXT: <AlignLeft className="size-4" />,
  MULTIPLE_CHOICE: <List className="size-4" />,
  YES_NO: <ToggleLeft className="size-4" />,
  NUMBER: <Hash className="size-4" />,
  FILE_UPLOAD: <Paperclip className="size-4" />,
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function JobFormBuilderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: form, isLoading } = useApplicationForm(jobId);
  const updateForm = useUpdateForm(jobId);

  const [questions, setQuestions] = useState<FormQuestion[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (form && !questions) setQuestions(form.questions);
  }, [form, questions]);

  if (isLoading || !questions) return <Skeleton className="h-96 w-full" />;

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

  const moveCustom = (id: string, dir: -1 | 1) => {
    const idx = customFields.findIndex((q) => q.id === id);
    const target = idx + dir;
    if (target < 0 || target >= customFields.length) return;
    const reordered = [...customFields];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setQuestions([...systemFields, ...reordered]);
    setDirty(true);
  };

  const addQuestion = (q: FormQuestion) => {
    setQuestions([...questions, q]);
    setDirty(true);
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
    <div className="max-w-2xl space-y-6">
      <h2 className="sr-only">Application form</h2>
      <Card>
        <CardHeader>
          <CardTitle>Candidate information</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {systemFields.map((q) => (
            <div key={q.id} className="flex items-center gap-4 py-3">
              <div className="flex-1">
                <div className="text-sm font-medium">{q.label}</div>
                <div className="text-xs text-muted-foreground">
                  {FORM_QUESTION_TYPE_LABELS[q.type]}
                </div>
              </div>
              <label className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  Required
                  <Switch checked={q.required} onCheckedChange={(v) => patch(q.id, { required: v })} disabled={!q.enabled} />
                </span>
                <span className="text-[11px]">Applicants must answer before submitting</span>
              </label>
              <label className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  Enabled
                  <Switch checked={q.enabled} onCheckedChange={(v) => patch(q.id, { enabled: v })} />
                </span>
                <span className="text-[11px]">Show on the application form</span>
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Custom questions</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add question
          </Button>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No custom questions yet. Add one to collect more from applicants.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {customFields.map((q, i) => (
                <div key={q.id} className="flex items-center gap-3 py-3">
                  <GripVertical className="size-4 text-muted-foreground/50" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{q.label}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{FORM_QUESTION_TYPE_LABELS[q.type]}</span>
                      {q.required && <Badge variant="muted">Required</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => moveCustom(q.id, -1)} disabled={i === 0}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveCustom(q.id, 1)} disabled={i === customFields.length - 1}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={updateForm.isPending} disabled={!dirty}>
          Save form
        </Button>
      </div>

      <AddQuestionDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addQuestion} uid={uid} />
    </div>
  );
}

function AddQuestionDialog({
  open,
  onOpenChange,
  onAdd,
  uid,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (q: FormQuestion) => void;
  uid: () => string;
}) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FormQuestionType>('SHORT_TEXT');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>(['', '']);

  const reset = () => {
    setLabel('');
    setType('SHORT_TEXT');
    setRequired(false);
    setOptions(['', '']);
  };

  const submit = () => {
    if (!label.trim()) return;
    const q: FormQuestion = {
      id: uid(),
      type,
      label: label.trim(),
      required,
      enabled: true,
      options:
        type === 'MULTIPLE_CHOICE'
          ? options.filter((o) => o.trim()).map((o) => ({ id: uid(), label: o.trim() }))
          : [],
      sortOrder: 0,
      system: false,
    };
    onAdd(q);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add question</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Question">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What's your expected salary?" autoFocus />
          </Field>
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {FORM_QUESTION_TYPES.filter((t) => t !== 'FILE_UPLOAD').map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
                    type === t ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {FORM_QUESTION_TYPE_ICONS[t]}
                  <span className="truncate">{FORM_QUESTION_TYPE_LABELS[t]}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Required" hint="Applicants must answer before submitting">
            <div className="flex h-9 items-center">
              <Switch checked={required} onCheckedChange={setRequired} />
            </div>
          </Field>

          {type === 'MULTIPLE_CHOICE' && (
            <Field label="Options">
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setOptions((o) => [...o, ''])}>
                  <Plus className="size-4" /> Add option
                </Button>
              </div>
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!label.trim()}>Add question</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
