'use client';

import Link from 'next/link';
import { ListChecks, Code2, ChevronRight } from 'lucide-react';
import { useQuestions } from '@/hooks/use-questions';
import { useFeature } from '@/hooks/use-features';
import { Card } from '@/components/ui/card';

function useTypeCount(type: 'MCQ' | 'CODING') {
  const { data } = useQuestions({ type, limit: 1 });
  return data?.total ?? 0;
}

export default function QuestionBankPage() {
  const mcqCount = useTypeCount('MCQ');
  const dsaCount = useTypeCount('CODING');
  const codingEnabled = useFeature('CODING_ASSESSMENT');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-page-title">Question Bank</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organize your questions by type, then add and manage them inside.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <BankCard
          href="/app/questions/mcq"
          icon={<ListChecks className="size-5" />}
          title="MCQ"
          description="Multiple-choice questions"
          count={mcqCount}
        />
        {codingEnabled && (
          <BankCard
            href="/app/questions/dsa"
            icon={<Code2 className="size-5" />}
            title="DSA"
            description="Coding · data structures & algorithms"
            count={dsaCount}
          />
        )}
      </div>
    </div>
  );
}

function BankCard({ href, icon, title, description, count }: { href: string; icon: React.ReactNode; title: string; description: string; count: number }) {
  return (
    <Link href={href}>
      <Card className="flex items-center gap-4 p-5 transition-colors hover:border-primary/40 hover:bg-muted/40">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">{description}</div>
          <div className="mt-1 text-xs text-muted-foreground">{count} question{count === 1 ? '' : 's'}</div>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Card>
    </Link>
  );
}
