import { ImageResponse } from 'next/og';
import { OGLayout, publicAssetDataUri } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <OGLayout
      bgSrc={publicAssetDataUri('og-background.png')}
      logoSrc={publicAssetDataUri('logo-mark.png')}
      headline="AI Native Hiring Platform"
      subtitle="Insights on modern hiring and AI recruitment."
    />,
    { ...size },
  );
}
