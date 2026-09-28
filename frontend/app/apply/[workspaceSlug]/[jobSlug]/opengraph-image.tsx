import { fetchPublicJob } from '@/lib/public-api';
import { OG_SIZE, OGLayout, ogImage } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Apply for this role, powered by Fluxberry';

type Params = Promise<{ workspaceSlug: string; jobSlug: string }>;

export default async function OpengraphImage({ params }: { params: Params }) {
  const { workspaceSlug, jobSlug } = await params;
  const data = await fetchPublicJob(workspaceSlug, jobSlug).catch(() => null);
  const company = data?.job.workspace?.name;

  return ogImage(
    <OGLayout
      headline={data?.job.title ?? 'Apply now'}
      subtitle={company ? `${company} is hiring, powered by Fluxberry.` : 'Apply now, powered by Fluxberry.'}
    />,
  );
}
