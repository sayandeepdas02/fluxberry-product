'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Users, LayoutGrid, Table as TableIcon, X } from 'lucide-react';
import type { ApplicationStage, CandidateAssessmentStatus } from '@fluxberry/shared';
import { APPLICATION_STAGES, CANDIDATE_ASSESSMENT_STATUSES } from '@fluxberry/shared';
import { useCandidates, useMoveStage, useBulkAction } from '@/hooks/use-candidates';
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

const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: 'Applied', SCREENING: 'Screening', ASSESSMENT: 'Assessment',
  INTERVIEW: 'Interview', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Rejected',
};

const ASSESSMENT_STATUS_LABELS: Record<CandidateAssessmentStatus, string> = {
  INVITED: 'Invited', STARTED: 'Started', GRADING: 'Grading',
  COMPLETED: 'Completed', EXPIRED: 'Expired', CANCELLED: 'Cancelled',
};

export function CandidatesView({ jobId: fixedJobId }: { jobId?: string }) {
  const [view, setView] = useState<'table' | 'board'>('table');
  const [jobId, setJobId] = useState<string | undefined>(fixedJobId);
  const [stage, setStage] = useState<ApplicationStage | undefined>();
  const [assessmentStatus, setAssessmentStatus] = useState<CandidateAssessmentStatus | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Clear selection when filters change.
  useEffect(() => { setSelectedIds(new Set()); }, [jobId, stage, assessmentStatus, search]);

  const effectiveJobId = fixedJobId ?? jobId;
  const { data, isLoading } = useCandidates({
    jobId: effectiveJobId,
    stage,
    assessmentStatus,
    search: search || undefined,
    limit: view === 'board' ? 100 : 50,
    sort: 'appliedAt',
    order: 'desc',
  });
  const jobsQuery = useJobs({ status: 'all' });
  const moveStage = useMoveStage();
  const bulkAction = useBulkAction();

  const onMove = (applicationId: string, s: ApplicationStage) => {
    moveStage.mutate(
      { applicationId, body: { stage: s } },
      { onSuccess: () => toast.success('Candidate moved') },
    );
  };

  const onBulkMove = (s: ApplicationStage) => {
    bulkAction.mutate(
      { action: 'move_stage', applicationIds: Array.from(selectedIds), stage: s },
      {
        onSuccess: (r) => {
          toast.success(`${r.succeeded} candidate${r.succeeded !== 1 ? 's' : ''} moved`);
          setSelectedIds(new Set());
        },
        onError: () => toast.error('Bulk action failed'),
      },
    );
  };

  const onBulkReject = () => {
    bulkAction.mutate(
      { action: 'reject', applicationIds: Array.from(selectedIds) },
      {
        onSuccess: (r) => {
          toast.success(`${r.succeeded} candidate${r.succeeded !== 1 ? 's' : ''} rejected`);
          setSelectedIds(new Set());
        },
        onError: () => toast.error('Bulk action failed'),
      },
    );
  };

  const items = data?.items ?? [];
  const allIds = items.map((c) => c.applicationId);

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
        <Select value={stage ?? 'all'} onValueChange={(v) => setStage(v === 'all' ? undefined : v as ApplicationStage)}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {APPLICATION_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assessmentStatus ?? 'all'} onValueChange={(v) => setAssessmentStatus(v === 'all' ? undefined : v as CandidateAssessmentStatus)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Assessment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any assessment</SelectItem>
            {CANDIDATE_ASSESSMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{ASSESSMENT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <CandidateTable
          items={items}
          showJob={!fixedJobId}
          selectedIds={selectedIds}
          onSelect={(id) => setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })}
          onSelectAll={() => setSelectedIds((prev) =>
            prev.size === allIds.length ? new Set() : new Set(allIds),
          )}
        />
      ) : (
        <CandidateBoard items={items} onMove={onMove} />
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium text-foreground mr-2">{selectedIds.size} selected</span>
            <Select onValueChange={(v) => onBulkMove(v as ApplicationStage)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Move to stage" />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STAGES.filter((s) => s !== 'REJECTED').map((s) => (
                  <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              disabled={bulkAction.isPending}
              onClick={onBulkReject}
            >
              Reject
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
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
