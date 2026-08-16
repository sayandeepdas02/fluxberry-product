'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ClipboardCheck } from 'lucide-react';
import { useAssessments } from '@/hooks/use-assessments';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AssessmentsPage() {
  const router = useRouter();
  const { data: assessments, isLoading } = useAssessments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title">Assessments</h1>
        <Button asChild>
          <Link href="/app/assessments/new"><Plus className="size-4" /> Create assessment</Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !assessments || assessments.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title="No assessments yet"
          description="Create an MCQ assessment from your question bank and send it to candidates."
          action={<Button asChild><Link href="/app/assessments/new">Create assessment</Link></Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-24">Questions</TableHead>
                <TableHead className="w-24">Candidates</TableHead>
                <TableHead className="w-28">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((a) => (
                <TableRow key={a.id} data-clickable="true" onClick={() => router.push(`/app/assessments/${a.id}`)}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.type}</TableCell>
                  <TableCell className="text-muted-foreground">{a.questionCount}</TableCell>
                  <TableCell className="text-muted-foreground">{a.candidateCount ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === 'PUBLISHED' ? 'success' : 'muted'}>
                      {a.status === 'PUBLISHED' ? 'Published' : a.status === 'ARCHIVED' ? 'Archived' : 'Draft'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
