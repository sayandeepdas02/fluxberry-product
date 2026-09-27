import { ImageResponse } from 'next/og';
import { fetchPublicCareers } from '@/lib/public-api';
import { OGLayout, publicAssetDataUri } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Params = Promise<{ careersSlug: string }>;

export default async function OpengraphImage({ params }: { params: Params }) {
  const { careersSlug } = await params;
  const data = await fetchPublicCareers(careersSlug).catch(() => null);

  const subtitle = data?.company.name
    ? `${data.company.name} is hiring — explore open roles.`
    : 'Explore open roles powered by Fluxberry AI.';

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
