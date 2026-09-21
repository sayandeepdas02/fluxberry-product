import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default social share image, used by every page that doesn't set its own OG image. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#ffffff',
          padding: '0 96px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, display: 'flex', flexWrap: 'wrap' }}>
            <div style={{ width: '50%', height: '50%', background: '#0e2f7e' }} />
            <div style={{ width: '50%', height: '50%', background: '#b8ccff' }} />
            <div style={{ width: '50%', height: '50%', background: '#b8ccff' }} />
            <div style={{ width: '50%', height: '50%', background: '#0a2462' }} />
          </div>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 600, color: '#0d1117', letterSpacing: '-0.02em' }}>
            Fluxberry AI
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 36, fontSize: 34, color: '#57606a', maxWidth: 880 }}>
          AI Native Hiring Platform
        </div>
      </div>
    ),
    { ...size },
  );
}
