import { ImageResponse } from 'next/og';
import { OGLayout, publicAssetDataUri } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default social share image — homepage and any page without its own opengraph-image. */
export default function OpengraphImage() {
  return new ImageResponse(
    <OGLayout
      bgSrc={publicAssetDataUri('og-background.png')}
      logoSrc={publicAssetDataUri('logo-mark.png')}
      headline="AI Native Hiring Platform"
      subtitle="Hire smarter, faster — with AI at every step."
    />,
    { ...size },
  );
}
