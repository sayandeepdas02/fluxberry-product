import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicJob } from '@/lib/public-api';
import { Markdown } from '@/components/ui/markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ApplyForm } from './apply-form';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS, toSchemaEmploymentType } from '@/lib/labels';
import { formatSalary, initials } from '@/lib/utils';
import { toPlainDescription, publicPageMetadata } from '@/lib/seo';

type Params = Promise<{ workspaceSlug: string; jobSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { workspaceSlug, jobSlug } = await params;
  const data = await fetchPublicJob(workspaceSlug, jobSlug);
  if (!data) return { title: 'Job not found' };
  const title = `${data.job.title} · ${data.job.workspace.name}`;
  const description = toPlainDescription(data.job.description);
  return publicPageMetadata({ title, description, path: `/apply/${workspaceSlug}/${jobSlug}` });
}

export default async function PublicJobPage({ params }: { params: Params }) {
  const { workspaceSlug, jobSlug } = await params;
  const data = await fetchPublicJob(workspaceSlug, jobSlug);
  if (!data) notFound();

  const { job, questions } = data;
  const salary = formatSalary(job.salary);

  // No publish timestamp on PublicJobDto — omit datePosted rather than fabricate one;
  // Google Jobs treats it as optional for basic JSON-LD validity.
  const jobPostingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    employmentType: toSchemaEmploymentType(job.employmentType),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.workspace.name,
      ...(job.workspace.logoUrl ? { logo: job.workspace.logoUrl } : {}),
    },
    ...(job.location
      ? { jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } } }
      : {}),
    ...(job.workMode === 'REMOTE' ? { jobLocationType: 'TELECOMMUTE' } : {}),
    ...(job.salary
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: job.salary.currency,
            value: { '@type': 'QuantitativeValue', minValue: job.salary.min, maxValue: job.salary.max, unitText: 'YEAR' },
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }} />
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 rounded-lg">
          {job.workspace.logoUrl && <AvatarImage src={job.workspace.logoUrl} alt={job.workspace.name} />}
          <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
            {initials(job.workspace.name)}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm font-medium text-muted-foreground">{job.workspace.name}</div>
      </div>

      <h1 className="mt-6 text-page-title">{job.title}</h1>
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
