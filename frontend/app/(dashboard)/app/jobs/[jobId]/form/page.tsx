'use client';

import { useParams } from 'next/navigation';
import { useApplicationFormEditor } from '@/hooks/use-application-form-editor';
import { ApplicationFormFields } from '@/components/jobs/application-form-fields';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function JobFormBuilderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const editor = useApplicationFormEditor(jobId);

  if (editor.isLoading) return <Skeleton className="mx-auto h-96 max-w-2xl" />;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <h2 className="text-xl font-semibold tracking-tight">Application form</h2>
        <p className="mt-1 text-sm text-muted-foreground">This is exactly what candidates see and fill out.</p>

        <div className="mt-8">
          <ApplicationFormFields editor={editor} />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => editor.save().catch(() => {})} loading={editor.saving} disabled={!editor.dirty}>
          Save form
        </Button>
      </div>
    </div>
  );
}
