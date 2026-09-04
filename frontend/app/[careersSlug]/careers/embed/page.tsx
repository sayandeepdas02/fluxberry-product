import { notFound } from 'next/navigation';
import { fetchPublicCareersJobs } from '@/lib/public-api';
import { CareersJobs } from '@/components/careers/careers-jobs';
import { publicConfig } from '@/lib/config';

type Params = Promise<{ careersSlug: string }>;

// Minimal, iframe-friendly rendering of just the open-roles section.
export default async function CareersEmbedPage({ params }: { params: Params }) {
  const { careersSlug } = await params;
  const data = await fetchPublicCareersJobs(careersSlug);
  if (!data) notFound();

  return (
    <div className="bg-transparent p-2">
      {data.heading && <h2 className="mb-3 text-base font-semibold">{data.heading}</h2>}
      <CareersJobs jobs={data.openings} appUrl={publicConfig.appUrl} target="_blank" />
    </div>
  );
}
