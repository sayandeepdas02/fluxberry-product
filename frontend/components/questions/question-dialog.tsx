'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DIFFICULTIES, type QuestionDto, type CreateQuestionInput, type Difficulty, type QuestionType } from '@fluxberry/shared';
import { useCreateQuestion, useUpdateQuestion, useQuestionCategories } from '@/hooks/use-questions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SkillsInput } from '@/components/jobs/skills-input';
import { toast } from '@/components/ui/sonner';
import { DIFFICULTY_LABELS } from '@/lib/labels';

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

/** Create/edit a question. MCQ shows an options editor; CODING (DSA) shows a problem statement. */
export function QuestionDialog({
  type,
  question,
  open,
  onOpenChange,
}: {
  type: QuestionType;
  question: QuestionDto | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const create = useCreateQuestion();
  const update = useUpdateQuestion(question?.id ?? '');
  const { data: categories } = useQuestionCategories();
  const isMcq = type === 'MCQ';

  const [text, setText] = useState(question?.questionText ?? '');
  const [options, setOptions] = useState<{ id: string; text: string }[]>(
    question?.options?.length ? question.options : [{ id: uid(), text: '' }, { id: uid(), text: '' }],
  );
  const [correctId, setCorrectId] = useState<string>(
    typeof question?.correctAnswer === 'string' ? question.correctAnswer : question?.options?.[0]?.id ?? '',
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(question?.difficulty ?? 'MEDIUM');
  const [category, setCategory] = useState(question?.category ?? '');
  const [skills, setSkills] = useState<string[]>(question?.skills ?? []);
  const [explanation, setExplanation] = useState(question?.explanation ?? '');

  const save = async () => {
    const input: CreateQuestionInput = isMcq
      ? {
          type: 'MCQ',
          questionText: text.trim(),
          options: options.filter((o) => o.text.trim()),
          correctAnswer: correctId,
          difficulty,
          category: category.trim() || 'General',
          skills,
          tags: [],
          explanation: explanation.trim() || undefined,
        }
      : {
          type: 'CODING',
          questionText: text.trim(),
          options: [],
          difficulty,
          category: category.trim() || 'General',
          skills,
          tags: [],
          explanation: explanation.trim() || undefined,
        };
    try {
      if (question) await update.mutateAsync(input);
      else await create.mutateAsync(input);
      toast.success(question ? 'Question updated' : 'Question added');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    }
  };

  const valid = isMcq
    ? text.trim() && options.filter((o) => o.text.trim()).length >= 2 && correctId && category.trim()
    : text.trim() && category.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? 'Edit' : 'Add'} {isMcq ? 'MCQ' : 'DSA'} question
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label={isMcq ? 'Question' : 'Problem statement'}>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={isMcq ? 2 : 5}
              placeholder={isMcq ? 'What does the useEffect cleanup function do?' : 'Given an array of integers, return indices of the two numbers that add up to a target…'}
            />
          </Field>

          {isMcq && (
            <Field label="Options" hint="Select the correct answer.">
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={correctId === opt.id} onChange={() => setCorrectId(opt.id)} />
                    <Input value={opt.text} onChange={(e) => setOptions((o) => o.map((x) => (x.id === opt.id ? { ...x, text: e.target.value } : x)))} placeholder={`Option ${i + 1}`} />
                    {options.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => setOptions((o) => o.filter((x) => x.id !== opt.id))}><Trash2 className="size-4" /></Button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setOptions((o) => [...o, { id: uid(), text: '' }])}><Plus className="size-4" /> Add option</Button>
              </div>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={isMcq ? 'JavaScript' : 'Arrays'} list="q-categories" />
              <datalist id="q-categories">{categories?.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Difficulty">
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{DIFFICULTY_LABELS[d]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Skills"><SkillsInput value={skills} onChange={setSkills} /></Field>
          <Field label={isMcq ? 'Explanation (optional)' : 'Expected approach / notes (optional)'}>
            <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} loading={create.isPending || update.isPending} disabled={!valid}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
