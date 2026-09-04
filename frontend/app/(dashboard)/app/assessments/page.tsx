'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ClipboardCheck, Trash2 } from 'lucide-react';
import type { AssessmentDto } from '@fluxberry/shared';
import { useAssessments, useDeleteAssessment } from '@/hooks/use-assessments';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

export default function AssessmentsPage() {
  const router = useRouter();
  const { data: assessments, isLoading } = useAssessments();
  const deleteAssessment = useDeleteAssessment();
  const [deleteTarget, setDeleteTarget] = useState<AssessmentDto | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAssessment.mutateAsync(deleteTarget.id);
      toast.success('Draft deleted');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete draft');
    }
  };

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
                <TableHead className="w-10" />
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
                  <TableCell>
                    {a.status === 'DRAFT' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(a);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete draft?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget ? `"${deleteTarget.name}" will be permanently deleted. This can't be undone.` : ''}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} loading={deleteAssessment.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
