'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import type { AssessmentDto } from '@fluxberry/shared';
import { useQuestions } from '@/hooks/use-questions';
import { useCreateAssessment, useUpdateAssessment } from '@/hooks/use-assessments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { DIFFICULTY_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

export function AssessmentBuilder({ initial }: { initial?: AssessmentDto | null }) {
  const router = useRouter();
  const create = useCreateAssessment();
  const update = useUpdateAssessment(initial?.id ?? '');
  const { data: bank, isLoading } = useQuestions({ type: 'MCQ', limit: 100 });

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? 30));
  const [selected, setSelected] = useState<string[]>(initial?.questions.map((q) => q.questionId) ?? []);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const save = async (publish: boolean) => {
    if (!name.trim()) return;
    const questions = selected.map((questionId, i) => ({ questionId, points: 1, sortOrder: i }));
    const payload = { type: 'MCQ' as const, name: name.trim(), description: description || undefined, durationMinutes: Number(duration) || 30, questions };
    try {
      if (initial) {
        await update.mutateAsync({ ...payload, status: publish ? 'PUBLISHED' : undefined });
      } else {
        const created = await create.mutateAsync(payload);
        if (publish) {
          const { api } = await import('@/lib/api-client');
          await api.patch(`/api/v1/assessments/${created.id}`, { status: 'PUBLISHED' });
        }
      }
      toast.success(publish ? 'Assessment published' : 'Assessment saved');
      router.push('/app/assessments');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/assessments')}><ArrowLeft className="size-4" /></Button>
        <h1 className="text-page-title">{initial ? 'Edit assessment' : 'Create assessment'}</h1>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Backend Fundamentals" /></Field>
            <Field label="Duration (minutes)"><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
          </div>
          <Field label="Description (optional)"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Questions</CardTitle>
          <span className="text-sm text-muted-foreground">{selected.length} selected</span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (bank?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No questions in the bank yet. Add some in Question Bank first.</p>
          ) : (
            <div className="divide-y divide-border">
              {bank!.items.map((q) => {
                const active = selected.includes(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => toggle(q.id)}
                    className="flex w-full items-start gap-3 py-3 text-left"
                  >
                    <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border', active ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                      {active && <Check className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{q.questionText}</div>
                      <div className="mt-1 flex gap-1.5">
                        <Badge variant="muted">{q.category}</Badge>
                        <Badge variant="outline">{DIFFICULTY_LABELS[q.difficulty]}</Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => save(false)} disabled={!name.trim()} loading={create.isPending || update.isPending}>Save draft</Button>
        <Button onClick={() => save(true)} disabled={!name.trim() || selected.length === 0} loading={create.isPending || update.isPending}>Publish</Button>
      </div>
    </div>
  );
}
