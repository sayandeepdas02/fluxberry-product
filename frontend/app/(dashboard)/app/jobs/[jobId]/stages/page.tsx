'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, ArrowUp, ArrowDown, Lock } from 'lucide-react';
import type { PipelineStage } from '@fluxberry/shared';
import { useJobStages, useUpdateJobStages } from '@/hooks/use-jobs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';

function uid() {
  return `custom_${Math.random().toString(36).slice(2, 10)}`;
}

const SWATCHES = ['#64748b', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

export default function JobStagesPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: stages, isLoading } = useJobStages(jobId);
  const updateStages = useUpdateJobStages(jobId);

  const [local, setLocal] = useState<PipelineStage[] | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (stages && !local) setLocal(stages);
  }, [stages, local]);

  if (isLoading || !local) return <Skeleton className="h-96 w-full" />;

  const patch = (id: string, changes: Partial<PipelineStage>) => {
    setLocal((s) => s!.map((st) => (st.id === id ? { ...st, ...changes } : st)));
    setDirty(true);
  };

  const remove = (id: string) => {
    setLocal((s) => s!.filter((st) => st.id !== id));
    setDirty(true);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = local.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (target < 0 || target >= local.length) return;
    const reordered = [...local];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setLocal(reordered);
    setDirty(true);
  };

  const addStage = () => {
    setLocal((s) => [...s!, { id: uid(), label: 'New stage', color: SWATCHES[s!.length % SWATCHES.length], sortOrder: s!.length, system: false, terminal: false }]);
    setDirty(true);
  };

  const save = async () => {
    try {
      const ordered = local.map((s, i) => ({ ...s, sortOrder: i }));
      await updateStages.mutateAsync(ordered);
      setDirty(false);
      toast.success('Pipeline stages saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save stages');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pipeline stages</CardTitle>
          <CardDescription>
            Customize the stages candidates move through for this job. Built-in stages can be renamed and
            reordered but not removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {local.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
              <button
                type="button"
                aria-label={`${stage.color ?? 'default'} color`}
                onClick={() => {
                  const idx = SWATCHES.indexOf(stage.color ?? '');
                  patch(stage.id, { color: SWATCHES[(idx + 1) % SWATCHES.length] });
                }}
                className="size-6 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: stage.color ?? '#94a3b8' }}
              />
              <Input
                value={stage.label}
                onChange={(e) => patch(stage.id, { label: e.target.value })}
                className="h-9 flex-1"
              />
              {stage.system && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Built-in stage">
                  <Lock className="size-3" /> Built-in
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={() => move(stage.id, -1)} disabled={i === 0}>
                <ArrowUp className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => move(stage.id, 1)} disabled={i === local.length - 1}>
                <ArrowDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                disabled={stage.system}
                onClick={() => remove(stage.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addStage} className="w-full">
            <Plus className="size-4" /> Add stage
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={updateStages.isPending} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
