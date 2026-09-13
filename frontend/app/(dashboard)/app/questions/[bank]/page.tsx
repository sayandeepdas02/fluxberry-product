'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { Plus, Search, ArrowLeft, Pencil, Trash2, ListChecks, Code2 } from 'lucide-react';
import { DIFFICULTIES, type QuestionDto, type Difficulty, type QuestionType } from '@fluxberry/shared';
import { useQuestions, useArchiveQuestion } from '@/hooks/use-questions';
import { QuestionDialog } from '@/components/questions/question-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { RecordMenu } from '@/components/ui/record-menu';
import { toast } from '@/components/ui/sonner';
import { DIFFICULTY_LABELS } from '@/lib/labels';

const BANKS: Record<string, { type: QuestionType; label: string; icon: React.ReactNode }> = {
  mcq: { type: 'MCQ', label: 'MCQ', icon: <ListChecks className="size-5" /> },
  dsa: { type: 'CODING', label: 'DSA', icon: <Code2 className="size-5" /> },
};

export default function QuestionBankTypePage() {
  const { bank } = useParams<{ bank: string }>();
  const meta = BANKS[bank];
  if (!meta) notFound();

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [editing, setEditing] = useState<QuestionDto | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuestions({
    type: meta.type,
    search: search || undefined,
    difficulty: difficulty === 'all' ? undefined : difficulty,
    limit: 100,
  });
  const archive = useArchiveQuestion();
  const questions = data?.items ?? [];

  return (
    <div className="space-y-6">
      <Link href="/app/questions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Question Bank
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{meta.icon}</span>
          <h1 className="text-page-title">{meta.label} questions</h1>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Add {meta.label} question
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search questions" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty | 'all')}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{DIFFICULTY_LABELS[d]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={meta.icon}
          title={`No ${meta.label} questions yet`}
          description={meta.type === 'MCQ' ? 'Add multiple-choice questions to build MCQ assessments.' : 'Add coding / DSA problems to your bank.'}
          action={<Button onClick={() => setCreating(true)}>Add {meta.label} question</Button>}
        />
      ) : (
        <Card className="divide-y divide-border">
          {questions.map((q) => (
            <div key={q.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-medium">{q.questionText}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="muted">{q.category}</Badge>
                  <Badge variant="outline">{DIFFICULTY_LABELS[q.difficulty]}</Badge>
                  {q.skills.slice(0, 3).map((s) => <Badge key={s} variant="muted">{s}</Badge>)}
                </div>
              </div>
              <RecordMenu
                actions={[
                  { label: 'Edit', icon: <Pencil className="size-4" />, onSelect: () => setEditing(q) },
                  {
                    label: 'Archive',
                    icon: <Trash2 className="size-4" />,
                    variant: 'destructive',
                    onSelect: () => archive.mutate(q.id, { onSuccess: () => toast.success('Question archived and removed from new assessments') }),
                  },
                ]}
              />
            </div>
          ))}
        </Card>
      )}

      {(creating || editing) && (
        <QuestionDialog
          type={meta.type}
          question={editing}
          open={creating || !!editing}
          onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        />
      )}
    </div>
  );
}
