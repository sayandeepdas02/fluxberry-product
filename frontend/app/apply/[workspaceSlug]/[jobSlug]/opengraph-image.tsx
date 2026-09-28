import { fetchPublicJob } from '@/lib/public-api';
import { publicConfig } from '@/lib/config';
import { OG_SIZE, OGLayout, ogImage } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Params = Promise<{ workspaceSlug: string; jobSlug: string }>;

export default async function OpengraphImage({ params }: { params: Params }) {
  const { workspaceSlug, jobSlug } = await params;
  const data = await fetchPublicJob(workspaceSlug, jobSlug).catch(() => null);

  const subtitle =
    data?.job.title && data.job.workspace?.name
      ? `${data.job.title} · ${data.job.workspace.name}`
      : data?.job.title ?? 'Apply now — powered by Fluxberry AI.';

  return ogImage(<OGLayout wordmark={publicConfig.appName} headline="AI Native Hiring Platform" subtitle={subtitle} />);
}
