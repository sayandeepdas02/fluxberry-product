'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Trash2 } from 'lucide-react';
import {
  DIFFICULTIES,
  CODING_LANGUAGES,
  codingLanguageById,
  type QuestionDto,
  type CreateQuestionInput,
  type Difficulty,
  type QuestionType,
} from '@/lib/shared';

// Monaco Editor loaded dynamically to avoid SSR bundle size issues.
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="h-[240px] animate-pulse rounded-md border border-border bg-muted" />,
});
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

type TestRow = { id: string; input: string; expected: string; hidden: boolean; points: number };

/** Create/edit a question. MCQ shows an options editor; CODING shows a problem + Judge0 test cases. */
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
  const [isMultiSelect, setIsMultiSelect] = useState<boolean>(question?.isMultiSelect ?? false);
  const [correctIds, setCorrectIds] = useState<string[]>(
    Array.isArray(question?.correctAnswer)
      ? question.correctAnswer
      : question?.correctAnswer
        ? [question.correctAnswer]
        : question?.options?.[0]?.id
          ? [question.options[0].id]
          : [],
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(question?.difficulty ?? 'MEDIUM');
  const [category, setCategory] = useState(question?.category ?? '');
  const [skills, setSkills] = useState<string[]>(question?.skills ?? []);
  const [explanation, setExplanation] = useState(question?.explanation ?? '');

  // Coding-specific state.
  const [languageIds, setLanguageIds] = useState<number[]>(
    question?.coding?.languageIds?.length ? question.coding.languageIds : [71, 63],
  );
  const [tests, setTests] = useState<TestRow[]>(
    question?.coding?.testCases?.length
      ? question.coding.testCases.map((t) => ({ id: uid(), input: t.input, expected: t.expected, hidden: t.hidden, points: t.points }))
      : [{ id: uid(), input: '', expected: '', hidden: false, points: 1 }],
  );
  const [cpuSec, setCpuSec] = useState<string>(question?.coding?.cpuTimeLimit ? String(question.coding.cpuTimeLimit) : '');
  const [memMb, setMemMb] = useState<string>(
    question?.coding?.memoryLimit ? String(Math.round(question.coding.memoryLimit / 1024)) : '',
  );
  const [starterCode, setStarterCode] = useState<{ languageId: number; code: string }[]>(
    question?.coding?.starterCode ?? [],
  );
  const [activeLangId, setActiveLangId] = useState<number | null>(languageIds[0] ?? null);

  const toggleLang = (id: number) => {
    setLanguageIds((ls) => {
      const next = ls.includes(id) ? ls.filter((x) => x !== id) : [...ls, id];
      setStarterCode((sc) => sc.filter((s) => next.includes(s.languageId)));
      setActiveLangId((cur) => (next.includes(cur ?? -1) ? cur : (next[0] ?? null)));
      return next;
    });
  };

  const setStarterFor = (langId: number, code: string) =>
    setStarterCode((sc) => {
      const existing = sc.find((s) => s.languageId === langId);
      if (existing) return sc.map((s) => (s.languageId === langId ? { ...s, code } : s));
      return [...sc, { languageId: langId, code }];
    });

  const toggleCorrectId = (id: string) => {
    if (isMultiSelect) {
      setCorrectIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    } else {
      setCorrectIds([id]);
    }
  };

  const save = async () => {
    let input: CreateQuestionInput;
    if (isMcq) {
      const correctAnswer = isMultiSelect ? correctIds : (correctIds[0] ?? '');
      input = {
        type: 'MCQ',
        questionText: text.trim(),
        options: options.filter((o) => o.text.trim()),
        correctAnswer,
        isMultiSelect,
        difficulty,
        category: category.trim() || 'General',
        skills,
        tags: [],
        explanation: explanation.trim() || undefined,
      };
    } else {
      input = {
        type: 'CODING',
        questionText: text.trim(),
        options: [],
        coding: {
          languageIds,
          starterCode: starterCode.filter((s) => languageIds.includes(s.languageId)),
          testCases: tests.map((t) => ({
            input: t.input,
            expected: t.expected,
            hidden: t.hidden,
            points: Number(t.points) || 1,
          })),
          cpuTimeLimit: cpuSec ? Number(cpuSec) : undefined,
          memoryLimit: memMb ? Number(memMb) * 1024 : undefined,
        },
        difficulty,
        category: category.trim() || 'General',
        skills,
        tags: [],
        explanation: explanation.trim() || undefined,
      };
    }
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
    ? text.trim() && options.filter((o) => o.text.trim()).length >= 2 && correctIds.length > 0 && category.trim()
    : text.trim() && category.trim() && languageIds.length >= 1 && tests.length >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {question ? 'Edit' : 'Add'} {isMcq ? 'MCQ' : 'coding'} question
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
            <>
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Multi-select</p>
                  <p className="text-xs text-muted-foreground">Allow candidates to select more than one correct answer.</p>
                </div>
                <Switch checked={isMultiSelect} onCheckedChange={(v) => { setIsMultiSelect(v); if (!v) setCorrectIds(correctIds.slice(0, 1)); }} />
              </div>
              <Field label="Options" hint={isMultiSelect ? 'Check all correct answers.' : 'Select the correct answer.'}>
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type={isMultiSelect ? 'checkbox' : 'radio'}
                        name="correct"
                        checked={correctIds.includes(opt.id)}
                        onChange={() => toggleCorrectId(opt.id)}
                      />
                      <Input value={opt.text} onChange={(e) => setOptions((o) => o.map((x) => (x.id === opt.id ? { ...x, text: e.target.value } : x)))} placeholder={`Option ${i + 1}`} />
                      {options.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => setOptions((o) => o.filter((x) => x.id !== opt.id))}><Trash2 className="size-4" /></Button>
                      )}
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setOptions((o) => [...o, { id: uid(), text: '' }])}><Plus className="size-4" /> Add option</Button>
                </div>
              </Field>
            </>
          )}

          {!isMcq && (
            <>
              <Field label="Languages" hint="Which languages candidates may solve in.">
                <div className="flex flex-wrap gap-2">
                  {CODING_LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLang(l.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition-colors',
                        languageIds.includes(l.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent',
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </Field>

              {languageIds.length > 0 && (
                <Field label="Starter code" hint="Pre-filled code shown to the candidate when they open this language.">
                  <div className="space-y-2">
                    <Select value={String(activeLangId ?? languageIds[0])} onValueChange={(v) => setActiveLangId(Number(v))}>
                      <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {languageIds.map((id) => (
                          <SelectItem key={id} value={String(id)}>{codingLanguageById(id)?.label ?? `Language ${id}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="overflow-hidden rounded-md border border-border">
                      <MonacoEditor
                        height="240px"
                        language={codingLanguageById(activeLangId ?? languageIds[0])?.monaco ?? 'plaintext'}
                        value={starterCode.find((s) => s.languageId === (activeLangId ?? languageIds[0]))?.code ?? ''}
                        onChange={(v) => setStarterFor(activeLangId ?? languageIds[0], v ?? '')}
                        theme="vs-dark"
                        options={{
                          fontSize: 13,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          lineNumbers: 'on',
                          automaticLayout: true,
                          padding: { top: 10, bottom: 10 },
                        }}
                      />
                    </div>
                  </div>
                </Field>
              )}

              <Field label="Test cases" hint="Hidden cases grade the submission but are never shown to the candidate.">
                <div className="space-y-3">
                  {tests.map((t, i) => (
                    <div key={t.id} className="rounded-lg border border-border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Case {i + 1}</span>
                        {tests.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => setTests((ts) => ts.filter((x) => x.id !== t.id))}><Trash2 className="size-4" /></Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Textarea value={t.input} onChange={(e) => setTests((ts) => ts.map((x) => (x.id === t.id ? { ...x, input: e.target.value } : x)))} rows={2} placeholder="stdin" className="font-mono text-xs" />
                        <Textarea value={t.expected} onChange={(e) => setTests((ts) => ts.map((x) => (x.id === t.id ? { ...x, expected: e.target.value } : x)))} rows={2} placeholder="expected stdout" className="font-mono text-xs" />
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={t.hidden} onChange={(e) => setTests((ts) => ts.map((x) => (x.id === t.id ? { ...x, hidden: e.target.checked } : x)))} />
                          Hidden
                        </label>
                        <label className="flex items-center gap-1.5">
                          Points
                          <Input type="number" min={0} value={t.points} onChange={(e) => setTests((ts) => ts.map((x) => (x.id === t.id ? { ...x, points: Number(e.target.value) } : x)))} className="h-7 w-16" />
                        </label>
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setTests((ts) => [...ts, { id: uid(), input: '', expected: '', hidden: false, points: 1 }])}><Plus className="size-4" /> Add test case</Button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="CPU limit (seconds)" hint="Optional — default 5s.">
                  <Input type="number" min={1} max={20} value={cpuSec} onChange={(e) => setCpuSec(e.target.value)} placeholder="5" />
                </Field>
                <Field label="Memory (MB)" hint="Optional — default 128MB.">
                  <Input type="number" min={16} max={512} value={memMb} onChange={(e) => setMemMb(e.target.value)} placeholder="128" />
                </Field>
              </div>
            </>
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
          <Field label={isMcq ? 'Explanation (optional)' : 'Notes for reviewers (optional)'}>
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
