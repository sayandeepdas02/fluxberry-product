import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchPublicCareersJobs } from '@/lib/public-api';
import { CareersJobs } from '@/components/careers/careers-jobs';
import { publicConfig } from '@/lib/config';
import { noIndexMetadata } from '@/lib/seo';

type Params = Promise<{ careersSlug: string }>;

export const metadata: Metadata = noIndexMetadata;

// Minimal, iframe-friendly rendering of just the open-roles section.
export default async function CareersEmbedPage({ params }: { params: Params }) {
  const { careersSlug } = await params;
  const data = await fetchPublicCareersJobs(careersSlug);
  if (!data) notFound();

  return (
    <div className="bg-transparent p-2">
      {data.heading && <h1 className="mb-3 text-card-title">{data.heading}</h1>}
      <CareersJobs jobs={data.openings} appUrl={publicConfig.appUrl} target="_blank" source="EMBED" />
    </div>
  );
}
