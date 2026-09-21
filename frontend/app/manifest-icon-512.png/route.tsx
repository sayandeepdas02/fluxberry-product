import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

/** 512x512 PWA icon referenced from `app/manifest.ts` — same mark as `icon.tsx`. */
export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexWrap: 'wrap' }}>
        <div style={{ width: '50%', height: '50%', background: '#0e2f7e' }} />
        <div style={{ width: '50%', height: '50%', background: '#b8ccff' }} />
        <div style={{ width: '50%', height: '50%', background: '#b8ccff' }} />
        <div style={{ width: '50%', height: '50%', background: '#0a2462' }} />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
