import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicCareers } from '@/lib/public-api';
import { publicConfig } from '@/lib/config';
import { toPlainDescription, publicPageMetadata } from '@/lib/seo';
import { CareersPageTracker } from '@/components/careers/careers-page-tracker';
import { EmbedJobBoard } from '@/components/careers/embed-job-board';

type Params = Promise<{ careersSlug: string }>;
type SearchParams = Promise<{ preview?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { careersSlug } = await params;
  const data = await fetchPublicCareers(careersSlug);
  if (!data) return { title: 'Careers' };
  const title = `Careers at ${data.company.name}`;
  const description = toPlainDescription(
    data.about.enabled && data.about.content ? data.about.content : `Open roles at ${data.company.name}`,
  );
  return publicPageMetadata({ title, description, path: `/${careersSlug}/careers` });
}

export default async function PublicCareersPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { careersSlug } = await params;
  const { preview } = await searchParams;
  const data = await fetchPublicCareers(careersSlug, preview);
  if (!data) notFound();

  // A list of links into the individual job pages, which each already carry the
  // full JobPosting schema — avoids emitting partial JobPosting stubs here (this
  // DTO has no description/datePosted, both required for Google Jobs rich results).
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: data.openings.map((job, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'WebPage',
        name: job.title,
        url: `${publicConfig.appUrl}${job.applyPath}`,
      },
    })),
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {data.openings.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <CareersPageTracker careersSlug={careersSlug} />
      <EmbedJobBoard
        company={data.company}
        openings={data.openings}
        appUrl={publicConfig.appUrl}
        accentColor={data.accentColor}
        intro={{
          headline: data.headline !== data.company.name ? data.headline : '',
          tagline: data.tagline,
          content: data.about.enabled ? data.about.content : '',
        }}
        jobsHeading={data.jobs.heading && data.jobs.heading !== 'Open roles' ? data.jobs.heading : undefined}
      />
    </div>
  );
}
