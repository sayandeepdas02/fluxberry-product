import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicCareersJobs } from '@/lib/public-api';
import { publicConfig } from '@/lib/config';
import { noIndexMetadata } from '@/lib/seo';
import { EmbedJobBoard } from '@/components/careers/embed-job-board';

type Params = Promise<{ careersSlug: string }>;

export const metadata: Metadata = noIndexMetadata;

export default async function CareersEmbedPage({ params }: { params: Params }) {
  const { careersSlug } = await params;
  const data = await fetchPublicCareersJobs(careersSlug);
  if (!data) notFound();

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>
      <EmbedJobBoard
        company={data.company}
        openings={data.openings}
        appUrl={publicConfig.appUrl}
        accentColor={data.accentColor}
      />
    </div>
  );
}
