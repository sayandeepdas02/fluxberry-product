import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicCareers } from '@/lib/public-api';
import { CareersJobs } from '@/components/careers/careers-jobs';
import { initials } from '@/lib/utils';

type Params = Promise<{ careersSlug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { careersSlug } = await params;
  const data = await fetchPublicCareers(careersSlug);
  if (!data) return { title: 'Careers' };
  const title = `Careers at ${data.company.name}`;
  const description = (data.tagline || data.about.content || `Open roles at ${data.company.name}`).slice(0, 160);
  return { title, description, openGraph: { title, description, type: 'website' } };
}

export default async function PublicCareersPage({ params }: { params: Params }) {
  const { careersSlug } = await params;
  const data = await fetchPublicCareers(careersSlug);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
            {data.company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.company.logoUrl} alt={data.company.name} className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              initials(data.company.name)
            )}
          </div>
          <div className="text-sm font-medium text-muted-foreground">{data.company.name}</div>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          {data.headline || `Join ${data.company.name}`}
        </h1>
        {data.tagline && <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{data.tagline}</p>}

        {data.about.enabled && data.about.content && (
          <section className="mt-10">
            <h2 className="text-section-title">About</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{data.about.content}</p>
          </section>
        )}

        {data.links.enabled && data.links.items.length > 0 && (
          <section className="mt-8 flex flex-wrap gap-3">
            {data.links.items.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                {l.label}
              </a>
            ))}
          </section>
        )}

        {data.team.enabled && data.team.members.length > 0 && (
          <section className="mt-10">
            <h2 className="text-section-title">Team</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.team.members.map((m, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt={m.name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      initials(m.name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.name}</div>
                    {m.role && <div className="truncate text-xs text-muted-foreground">{m.role}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.jobs.enabled && (
          <section className="mt-12">
            <h2 className="text-section-title mb-3">{data.jobs.heading || 'Open roles'}</h2>
            <CareersJobs jobs={data.openings} />
          </section>
        )}
      </div>
    </div>
  );
}
