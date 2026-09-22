import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default social share image, used by every page that doesn't set its own OG image. */
export default function OpengraphImage() {
  const logoData = readFileSync(join(process.cwd(), 'public', 'logo-mark.png'));
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={64} height={64} alt="" />
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
