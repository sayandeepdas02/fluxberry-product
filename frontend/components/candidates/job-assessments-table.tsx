'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import type { JobAssessmentRowDto, CandidateAssessmentStatus } from '@fluxberry/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ASSESSMENT_STATUS_LABELS } from '@/lib/labels';
import { initials } from '@/lib/utils';

const STATUS_VARIANT: Record<CandidateAssessmentStatus, 'success' | 'muted' | 'warning' | 'destructive' | 'primary'> = {
  INVITED: 'muted',
  STARTED: 'primary',
  GRADING: 'warning',
  COMPLETED: 'success',
  EXPIRED: 'muted',
  CANCELLED: 'destructive',
};

export function JobAssessmentsTable({ items }: { items: JobAssessmentRowDto[] }) {
  const router = useRouter();

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>Assessment</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-20">Score</TableHead>
            <TableHead className="w-32">Invited</TableHead>
            <TableHead className="w-32">Completed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow
              key={`${r.applicationId}-${r.assessmentId}-${r.invitedAt ?? ''}`}
              data-clickable="true"
              onClick={() => router.push(`/app/candidates/${r.candidateId}`)}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">{initials(r.candidateName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{r.candidateName}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.candidateEmail}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="truncate">{r.assessmentName}</span>
                  {r.assessmentType === 'CODING' && <Badge variant="outline">Coding</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status]}>{ASSESSMENT_STATUS_LABELS[r.status]}</Badge>
              </TableCell>
              <TableCell className="font-semibold tabular-nums">
                {r.status === 'COMPLETED' && r.score != null ? `${r.score}%` : '—'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.invitedAt ? formatDistanceToNow(new Date(r.invitedAt), { addSuffix: true }) : '—'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.completedAt ? formatDistanceToNow(new Date(r.completedAt), { addSuffix: true }) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
