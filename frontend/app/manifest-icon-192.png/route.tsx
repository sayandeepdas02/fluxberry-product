import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

/** 192x192 PWA icon referenced from `app/manifest.ts` — same mark as `icon.tsx`. */
export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexWrap: 'wrap' }}>
        <div style={{ width: '50%', height: '50%', background: '#ec4899' }} />
        <div style={{ width: '50%', height: '50%', background: '#fbcfe8' }} />
        <div style={{ width: '50%', height: '50%', background: '#fbcfe8' }} />
        <div style={{ width: '50%', height: '50%', background: '#be185d' }} />
      </div>
    ),
    { width: 192, height: 192 },
  );
}
