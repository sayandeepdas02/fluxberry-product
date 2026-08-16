import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicJob } from '@/lib/public-api';
import { Markdown } from '@/components/ui/markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ApplyForm } from './apply-form';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '@/lib/labels';
import { formatSalary, initials } from '@/lib/utils';

type Params = Promise<{ workspaceSlug: string; jobSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { workspaceSlug, jobSlug } = await params;
  const data = await fetchPublicJob(workspaceSlug, jobSlug);
  if (!data) return { title: 'Job not found' };
  const title = `${data.job.title} · ${data.job.workspace.name}`;
  const description = data.job.description.replace(/[#*_>-]/g, '').slice(0, 160);
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export default async function PublicJobPage({ params }: { params: Params }) {
  const { workspaceSlug, jobSlug } = await params;
  const data = await fetchPublicJob(workspaceSlug, jobSlug);
  if (!data) notFound();

  const { job, questions } = data;
  const salary = formatSalary(job.salary);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 rounded-lg">
          {job.workspace.logoUrl && <AvatarImage src={job.workspace.logoUrl} alt={job.workspace.name} />}
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
            {initials(job.workspace.name)}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm font-medium text-muted-foreground">{job.workspace.name}</div>
      </div>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{job.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {[job.location, EMPLOYMENT_LABELS[job.employmentType], WORK_MODE_LABELS[job.workMode]]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {salary && <p className="mt-1 text-sm font-medium">{salary}</p>}

      {job.description && (
        <div className="mt-8 border-t border-border pt-8">
          <Markdown content={job.description} />
        </div>
      )}

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-section-title">Apply for this role</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No account needed — it only takes a minute.
        </p>
        <div className="mt-6">
          <ApplyForm workspaceSlug={workspaceSlug} jobSlug={jobSlug} questions={questions} />
        </div>
      </div>
    </div>
  );
}
