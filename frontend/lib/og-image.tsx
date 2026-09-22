/** Shared layout for all OpenGraph images. 1200×630px. */
export function OGLayout({
  bgSrc,
  logoSrc,
  headline,
  subtitle,
}: {
  bgSrc: string;
  logoSrc: string;
  headline: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundImage: `url(${bgSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark gradient at the bottom for text legibility */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          background:
            'linear-gradient(to top, rgba(6,18,64,0.92) 0%, rgba(6,18,64,0.60) 42%, transparent 100%)',
        }}
      />

      {/* Top-left: logo badge */}
      <div
        style={{
          position: 'absolute',
          top: 48,
          left: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(6,18,64,0.60)',
          borderRadius: 100,
          padding: '10px 22px 10px 14px',
          border: '1px solid rgba(255,255,255,0.22)',
        }}
      >
        <img src={logoSrc} width={32} height={32} alt="" />
        <div
          style={{
            display: 'flex',
            color: 'white',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          Fluxberry AI
        </div>
      </div>

      {/* Bottom content */}
      <div
        style={{
          position: 'absolute',
          bottom: 64,
          left: 72,
          right: 72,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            color: 'white',
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: '-0.035em',
            lineHeight: 1.08,
            maxWidth: 1056,
          }}
        >
          {headline}
        </div>
        {subtitle && (
          <div
            style={{
              display: 'flex',
              color: 'rgba(255,255,255,0.72)',
              fontSize: 30,
              fontWeight: 400,
              maxWidth: 800,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

/** Read a file from /public and return a base64 data URI. Only call from Node.js runtime. */
export function publicAssetDataUri(filename: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require('path') as typeof import('path');
  const data = readFileSync(join(process.cwd(), 'public', filename));
  const ext = filename.split('.').pop() ?? 'png';
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${data.toString('base64')}`;
}
