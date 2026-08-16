'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import type { CandidateListItemDto } from '@fluxberry/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { ScoreBadge } from './score-badge';
import { StageBadge } from './stage-badge';
import { formatSalary, initials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function CandidateTable({
  items,
  showJob = true,
}: {
  items: CandidateListItemDto[];
  showJob?: boolean;
}) {
  const router = useRouter();
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            {showJob && <TableHead>Job</TableHead>}
            <TableHead className="w-20">Score</TableHead>
            <TableHead className="w-28">Stage</TableHead>
            <TableHead className="w-32">Location</TableHead>
            <TableHead className="w-32">Expected</TableHead>
            <TableHead className="w-28">Applied</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => (
            <TableRow
              key={c.applicationId}
              data-clickable="true"
              onClick={() => router.push(`/app/candidates/${c.candidateId}`)}
            >
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
              <TableCell><StageBadge stage={c.stage} /></TableCell>
              <TableCell className="text-muted-foreground">{c.location ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{formatSalary({ min: c.expectedSalary }) ?? '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(c.appliedAt), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
