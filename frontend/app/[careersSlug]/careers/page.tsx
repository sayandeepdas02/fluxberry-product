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
  const description = toPlainDescription(`Open roles at ${data.company.name}`);
  return publicPageMetadata({ title, description, path: `/${careersSlug}/careers` });
}

export default async function PublicCareersPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { careersSlug } = await params;
  const { preview } = await searchParams;
  const data = await fetchPublicCareers(careersSlug, preview);
  if (!data) notFound();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <CareersPageTracker careersSlug={careersSlug} />
      <EmbedJobBoard
        company={data.company}
        openings={data.openings}
        appUrl={publicConfig.appUrl}
        accentColor={data.accentColor}
      />
    </div>
  );
}
