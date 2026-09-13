'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { UserCheck, UserX } from 'lucide-react';
import type { CandidateListItemDto, PipelineStage } from '@fluxberry/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { RecordMenu } from '@/components/ui/record-menu';
import { ScoreBadge } from './score-badge';
import { StageBadge } from './stage-badge';
import { LabelChips } from './label-picker';
import { formatSalary, initials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function CandidateTable({
  items,
  showJob = true,
  stages,
  selectedIds,
  onSelect,
  onSelectAll,
  onShortlist,
  onRequestReject,
}: {
  items: CandidateListItemDto[];
  showJob?: boolean;
  /** The job's effective stage list, when scoped to one job — resolves custom stage labels. */
  stages?: PipelineStage[];
  selectedIds?: Set<string>;
  onSelect?: (applicationId: string) => void;
  onSelectAll?: () => void;
  /** Per-row quick actions (spec item 4.7) — omit either to hide that action everywhere. */
  onShortlist?: (applicationId: string) => void;
  onRequestReject?: (applicationId: string) => void;
}) {
  const router = useRouter();
  const selectable = Boolean(selectedIds && onSelect && onSelectAll);
  const allSelected = selectable && selectedIds!.size === items.length && items.length > 0;
  const someSelected = selectable && selectedIds!.size > 0 && selectedIds!.size < items.length;
  const hasRowActions = Boolean(onShortlist || onRequestReject);

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={onSelectAll}
                  className="cursor-pointer"
                />
              </TableHead>
            )}
            <TableHead>Candidate</TableHead>
            {showJob && <TableHead>Job</TableHead>}
            <TableHead className="w-20">Score</TableHead>
            <TableHead className="w-28">Stage</TableHead>
            <TableHead>Labels</TableHead>
            <TableHead className="w-32">Location</TableHead>
            <TableHead className="w-32">Expected</TableHead>
            <TableHead className="w-28">Applied</TableHead>
            {hasRowActions && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => {
            const isSelected = selectable && selectedIds!.has(c.applicationId);
            return (
              <TableRow
                key={c.applicationId}
                data-clickable="true"
                data-selected={isSelected}
                className={isSelected ? 'bg-accent/40' : undefined}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('input[type="checkbox"]')) return;
                  router.push(`/app/candidates/${c.candidateId}`);
                }}
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelect!(c.applicationId)}
                      className="cursor-pointer"
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                    </div>
                  </div>
                </TableCell>
                {showJob && <TableCell className="text-muted-foreground">{c.jobTitle}</TableCell>}
                <TableCell><ScoreBadge score={c.score} /></TableCell>
                <TableCell><StageBadge stage={c.stage} stages={stages} /></TableCell>
                <TableCell><LabelChips labels={c.labels} /></TableCell>
                <TableCell className="text-muted-foreground">{c.location ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatSalary({ min: c.expectedSalary }) ?? '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.appliedAt), { addSuffix: true })}
                </TableCell>
                {hasRowActions && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RecordMenu
                      actions={[
                        { label: 'Shortlist', icon: <UserCheck className="size-4" />, hidden: !onShortlist, onSelect: () => onShortlist!(c.applicationId) },
                        { label: 'Reject', icon: <UserX className="size-4" />, variant: 'destructive', hidden: !onRequestReject, onSelect: () => onRequestReject!(c.applicationId) },
                      ]}
                    />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
