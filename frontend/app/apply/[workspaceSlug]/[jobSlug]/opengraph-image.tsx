import { ImageResponse } from 'next/og';
import { fetchPublicJob } from '@/lib/public-api';
import { OGLayout, publicAssetDataUri } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Params = Promise<{ workspaceSlug: string; jobSlug: string }>;

export default async function OpengraphImage({ params }: { params: Params }) {
  const { workspaceSlug, jobSlug } = await params;
  const data = await fetchPublicJob(workspaceSlug, jobSlug).catch(() => null);

  const subtitle =
    data?.job.title && data.job.workspace?.name
      ? `${data.job.title} · ${data.job.workspace.name}`
      : data?.job.title ?? 'Apply now — powered by Fluxberry AI.';

  return new ImageResponse(
    <OGLayout
      bgSrc={publicAssetDataUri('og-background.png')}
      logoSrc={publicAssetDataUri('logo-mark.png')}
      headline="AI Native Hiring Platform"
      subtitle={subtitle}
    />,
    { ...size },
  );
}
