'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Users, LayoutGrid, Table as TableIcon } from 'lucide-react';
import type { ApplicationStage } from '@fluxberry/shared';
import { useCandidates, useMoveStage } from '@/hooks/use-candidates';
import { useJobs } from '@/hooks/use-jobs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CandidateTable } from './candidate-table';
import { CandidateBoard } from './candidate-board';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

export function CandidatesView({ jobId: fixedJobId }: { jobId?: string }) {
  const [view, setView] = useState<'table' | 'board'>('table');
  const [jobId, setJobId] = useState<string | undefined>(fixedJobId);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const effectiveJobId = fixedJobId ?? jobId;
  const { data, isLoading } = useCandidates({
    jobId: effectiveJobId,
    search: search || undefined,
    limit: view === 'board' ? 100 : 50,
    sort: 'appliedAt',
    order: 'desc',
  });
  const jobsQuery = useJobs({ status: 'all' });
  const moveStage = useMoveStage();

  const onMove = (applicationId: string, stage: ApplicationStage) => {
    moveStage.mutate(
      { applicationId, body: { stage } },
      { onSuccess: () => toast.success('Candidate moved') },
    );
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!fixedJobId && (
          <Select value={jobId ?? 'all'} onValueChange={(v) => setJobId(v === 'all' ? undefined : v)}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="All jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {jobsQuery.data?.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search candidates"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="ml-auto inline-flex rounded-md border border-border p-0.5">
          <ViewToggle active={view === 'table'} onClick={() => setView('table')} icon={<TableIcon className="size-4" />} label="Table" />
          <ViewToggle active={view === 'board'} onClick={() => setView('board')} icon={<LayoutGrid className="size-4" />} label="Board" />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No candidates yet"
          description="Candidates will appear here when people apply to your jobs."
          action={
            !fixedJobId ? (
              <Button asChild>
                <Link href="/app/jobs/new">Create a job</Link>
              </Button>
            ) : undefined
          }
        />
      ) : view === 'table' ? (
        <CandidateTable items={items} showJob={!fixedJobId} />
      ) : (
        <CandidateBoard items={items} onMove={onMove} />
      )}
    </div>
  );
}

function ViewToggle({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition-colors',
        active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon} {label}
    </button>
  );
}
