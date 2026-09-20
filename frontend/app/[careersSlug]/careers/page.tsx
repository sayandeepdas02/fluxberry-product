import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicCareers } from '@/lib/public-api';
import { CareersFilterWrapper } from '@/components/careers/careers-filter-wrapper';
import { publicConfig } from '@/lib/config';
import { initials } from '@/lib/utils';
import { toPlainDescription, publicPageMetadata } from '@/lib/seo';
import { CareersPageTracker } from '@/components/careers/careers-page-tracker';
import type { PublicCareersDto, SectionKey } from '@fluxberry/shared';

type Params = Promise<{ careersSlug: string }>;
type SearchParams = Promise<{ preview?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { careersSlug } = await params;
  const data = await fetchPublicCareers(careersSlug);
  if (!data) return { title: 'Careers' };
  const title = `Careers at ${data.company.name}`;
  const description = toPlainDescription(data.tagline || data.about.content || `Open roles at ${data.company.name}`);
  return publicPageMetadata({ title, description, path: `/${careersSlug}/careers` });
}

export default async function PublicCareersPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { careersSlug } = await params;
  const { preview } = await searchParams;
  const data = await fetchPublicCareers(careersSlug, preview);
  if (!data) notFound();

  const accent = data.accentColor || undefined;
  const cssVars = accent ? { '--accent': accent } as React.CSSProperties : undefined;

  const sectionRenderers: Record<SectionKey, React.ReactNode> = {
    about: data.about.enabled && data.about.content ? (
      <section key="about" className="mt-10">
        <h2 className="text-section-title" style={accent ? { borderBottom: `2px solid ${accent}`, display: 'inline-block', paddingBottom: '4px' } : undefined}>About</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{data.about.content}</p>
      </section>
    ) : null,

    links: data.links.enabled && data.links.items.length > 0 ? (
      <section key="links" className="mt-8 flex flex-wrap gap-3">
        {data.links.items.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            {l.label}
          </a>
        ))}
      </section>
    ) : null,

    team: data.team.enabled && data.team.members.length > 0 ? (
      <section key="team" className="mt-10">
        <h2 className="text-section-title" style={accent ? { borderBottom: `2px solid ${accent}`, display: 'inline-block', paddingBottom: '4px' } : undefined}>Team</h2>
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
    ) : null,

    jobs: data.jobs.enabled ? (
      <section key="jobs" className="mt-12">
        <h2 className="text-section-title mb-3" style={accent ? { borderBottom: `2px solid ${accent}`, display: 'inline-block', paddingBottom: '4px' } : undefined}>
          {data.jobs.heading || 'Open roles'}
        </h2>
        <CareersFilterWrapper jobs={data.openings} appUrl={publicConfig.appUrl} accentColor={accent} />
      </section>
    ) : null,

    benefits: data.benefits.enabled && data.benefits.items.length > 0 ? (
      <section key="benefits" className="mt-10">
        <h2 className="text-section-title" style={accent ? { borderBottom: `2px solid ${accent}`, display: 'inline-block', paddingBottom: '4px' } : undefined}>Benefits & Perks</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.benefits.items.map((b, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <span className="text-2xl">{b.emoji}</span>
              <div className="mt-2 text-sm font-medium">{b.label}</div>
              {b.description && <div className="mt-1 text-xs text-muted-foreground">{b.description}</div>}
            </div>
          ))}
        </div>
      </section>
    ) : null,
  };

  return (
    <div className="min-h-screen bg-muted/30" style={cssVars}>
      <CareersPageTracker careersSlug={careersSlug} />
      {/* Cover hero */}
      {data.coverImageUrl && (
        <div className="relative h-36 w-full sm:h-48 md:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.coverImageUrl} alt="" className="h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: accent
                ? `linear-gradient(to bottom, ${accent}55, ${accent}aa)`
                : 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5))',
            }}
          />
        </div>
      )}

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

        <h1 className="mt-6 text-page-title">
          {data.headline || `Join ${data.company.name}`}
        </h1>
        {data.tagline && <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{data.tagline}</p>}

        {/* Job count */}
        {data.openings.length > 0 && (
          <p className="mt-2 text-sm font-medium" style={accent ? { color: accent } : undefined}>
            {data.openings.length} open {data.openings.length === 1 ? 'role' : 'roles'}
          </p>
        )}

        {/* Dynamic sections */}
        {(data.sectionOrder ?? ['about', 'links', 'team', 'jobs']).map((key) => sectionRenderers[key as SectionKey])}
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Powered by{' '}
        <a href="https://fluxberry.in" target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
          Fluxberry
        </a>
      </div>
    </div>
  );
}
