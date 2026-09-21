'use client';

import { useEffect, useState } from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { type FormQuestion } from '@/lib/shared';
import { useApplicationForm, useUpdateForm } from '@/hooks/use-form';
import { toast } from '@/components/ui/sonner';

/**
 * Shared state/behavior behind the application-form editor: loading the job's
 * form, editing its questions (patch/add/remove/reorder), and saving. Used by
 * both the standalone "Application form" job tab and the job-creation wizard.
 */
export function useApplicationFormEditor(jobId: string) {
  const { data: form, isLoading } = useApplicationForm(jobId);
  const updateForm = useUpdateForm(jobId);

  const [questions, setQuestions] = useState<FormQuestion[] | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (form && !questions) setQuestions(form.questions);
  }, [form, questions]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const systemFields = questions?.filter((q) => q.system) ?? [];
  const customFields = questions?.filter((q) => !q.system) ?? [];

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

  const save = async (opts?: { silent?: boolean }) => {
    if (!questions) return;
    try {
      const ordered = questions.map((q, i) => ({ ...q, sortOrder: i }));
      await updateForm.mutateAsync(ordered);
      setDirty(false);
      if (!opts?.silent) toast.success('Your changes are saved and visible to new applicants');
    } catch (err) {
      if (!opts?.silent) toast.error(err instanceof Error ? err.message : 'Could not save form');
      throw err;
    }
  };

  return {
    isLoading: isLoading || !questions,
    questions,
    systemFields,
    customFields,
    dirty,
    saving: updateForm.isPending,
    sensors,
    patch,
    removeQuestion,
    addQuestion,
    onDragEnd,
    save,
  };
}

export type ApplicationFormEditor = ReturnType<typeof useApplicationFormEditor>;
