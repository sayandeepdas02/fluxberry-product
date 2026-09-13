'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Users, LayoutGrid, Table as TableIcon, X } from 'lucide-react';
import type { CandidateAssessmentStatus, PipelineStage } from '@fluxberry/shared';
import { CANDIDATE_ASSESSMENT_STATUSES, defaultPipelineStages } from '@fluxberry/shared';
import { useCandidates, useMoveStage, useBulkAction, useShortlist, useReject } from '@/hooks/use-candidates';
import { useJobs, useJobStages } from '@/hooks/use-jobs';
import { useLabels } from '@/hooks/use-labels';
import { useCandidateListIds } from '@/app/(dashboard)/app/candidates/candidate-list-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CandidateTable } from './candidate-table';
import { CandidateBoard } from './candidate-board';
import { RejectDialog } from './reject-dialog';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { ASSESSMENT_STATUS_LABELS } from '@/lib/labels';

export function CandidatesView({ jobId: fixedJobId }: { jobId?: string }) {
  const [view, setView] = useState<'table' | 'board'>('table');
  const [jobId, setJobId] = useState<string | undefined>(fixedJobId);
  const [stage, setStage] = useState<string | undefined>();
  const [labelId, setLabelId] = useState<string | undefined>();
  const [assessmentStatus, setAssessmentStatus] = useState<CandidateAssessmentStatus | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const { setIds: setListIds } = useCandidateListIds();
  const shortlist = useShortlist();
  const reject = useReject();

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Clear selection when filters change.
  useEffect(() => { setSelectedIds(new Set()); }, [jobId, stage, labelId, assessmentStatus, search]);

  const effectiveJobId = fixedJobId ?? jobId;
  const { data, isLoading } = useCandidates({
    jobId: effectiveJobId,
    stage,
    labelId,
    assessmentStatus,
    search: search || undefined,
    limit: view === 'board' ? 100 : 50,
    sort: 'appliedAt',
    order: 'desc',
  });
  const jobsQuery = useJobs({ status: 'all' });
  const { data: labels } = useLabels();
  const moveStage = useMoveStage();
  const bulkAction = useBulkAction();

  const items = data?.items ?? [];

  // Feeds the candidates-list modal's prev/next navigation (spec item 4.1) — a
  // no-op outside the global candidates route, since the context defaults to
  // a harmless no-op there (e.g. a job-scoped candidates tab). Deduplicated,
  // since a candidate with multiple applications produces adjacent rows with
  // the same candidateId — an unduplicated list would let the modal compute a
  // "next" id equal to the current one, stalling navigation there.
  useEffect(() => {
    setListIds(Array.from(new Set(items.map((c) => c.candidateId))));
  }, [items, setListIds]);

  // The cross-job "All candidates" view can't meaningfully merge differently
  // named per-job stages, so it stays on the 7 system defaults; a job-scoped
  // view (fixedJobId set) uses that job's real (possibly customized) stages.
  const jobStagesQuery = useJobStages(fixedJobId ?? '');
  const stages: PipelineStage[] = fixedJobId ? jobStagesQuery.data ?? [] : defaultPipelineStages();

  const onMove = (applicationId: string, s: string) => {
    moveStage.mutate(
      { applicationId, body: { stage: s } },
      { onSuccess: () => toast.success('Candidate moved') },
    );
  };

  const onBulkMove = (s: string) => {
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

  const allIds = items.map((c) => c.applicationId);
  const rejectTargetApp = items.find((c) => c.applicationId === rejectTarget);

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
        <Select value={stage ?? 'all'} onValueChange={(v) => setStage(v === 'all' ? undefined : v)}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(labels?.length ?? 0) > 0 && (
          <Select value={labelId ?? 'all'} onValueChange={(v) => setLabelId(v === 'all' ? undefined : v)}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="All labels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All labels</SelectItem>
              {labels!.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
          stages={stages}
          selectedIds={selectedIds}
          onSelect={(id) => setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          })}
          onSelectAll={() => setSelectedIds((prev) =>
            prev.size === allIds.length ? new Set() : new Set(allIds),
          )}
          onShortlist={(applicationId) =>
            shortlist.mutate({ applicationId }, { onSuccess: () => toast.success('Candidate shortlisted') })
          }
          onRequestReject={setRejectTarget}
        />
      ) : (
        <CandidateBoard items={items} stages={stages} onMove={onMove} />
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium text-foreground mr-2">{selectedIds.size} selected</span>
            <Select onValueChange={(v) => onBulkMove(v)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Move to stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.filter((s) => !s.terminal).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
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

      <RejectDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(o) => { if (!o) setRejectTarget(null); }}
        loading={reject.isPending}
        onReject={(reason, note) => {
          if (!rejectTargetApp) return;
          reject.mutate(
            { applicationId: rejectTargetApp.applicationId, body: { reason, note } },
            { onSuccess: () => { toast.success('Candidate rejected and notified'); setRejectTarget(null); } },
          );
        }}
      />
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
