import { ImageResponse } from 'next/og';
import type { ReactElement, ReactNode } from 'react';

/*
 * Social share images (1200×630), in the landing hero's look: its painted sky
 * (public/og/sky.jpg, the upper sky of hero-landscape.webp), a deep-blue wash
 * behind white text, and the F-mark with the "Fluxberry" wordmark. Set in the
 * marketing fonts, Manrope and Inter, loaded from assets/og-fonts (the image
 * renderer can't use next/font). Node.js runtime only: everything is read from disk.
 */

export const OG_SIZE = { width: 1200, height: 630 };

/** Read a file from the project and return its bytes. */
function readProjectFile(...segments: string[]): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require('path') as typeof import('path');
  return readFileSync(join(process.cwd(), ...segments));
}

/** Read a file from /public and return a base64 data URI. */
export function publicAssetDataUri(filename: string): string {
  const ext = filename.split('.').pop() ?? 'png';
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${readProjectFile('public', filename).toString('base64')}`;
}

function ogFonts() {
  const font = (file: string) => readProjectFile('assets', 'og-fonts', file);
  return [
    { name: 'Manrope', data: font('manrope-600.woff'), weight: 600 as const, style: 'normal' as const },
    { name: 'Manrope', data: font('manrope-700.woff'), weight: 700 as const, style: 'normal' as const },
    { name: 'Inter', data: font('inter-400.woff'), weight: 400 as const, style: 'normal' as const },
  ];
}

/** Render a share image at the standard size with the marketing fonts. */
export function ogImage(element: ReactElement): ImageResponse {
  return new ImageResponse(element, { ...OG_SIZE, fonts: ogFonts() });
}

/** The sky, the wash and the brand lockup; the content sits centred under the lockup. */
function Frame({ wordmark = 'Fluxberry', top = 58, children }: { wordmark?: string; top?: number; children: ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Manrope' }}>
      <img src={publicAssetDataUri('og/sky.jpg')} width={OG_SIZE.width} height={OG_SIZE.height} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
      {/* Deep blue, not black, so the sky stays saturated; it fades out before the clouds. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          backgroundImage: 'linear-gradient(180deg, rgba(3,37,99,0.5) 0%, rgba(3,37,99,0.28) 50%, rgba(3,37,99,0) 82%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: `${top}px 80px 0`,
          color: 'white',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 14 }}>
          <img src={publicAssetDataUri('logo-mark.png')} width={48} height={48} alt="" style={{ borderRadius: 12 }} />
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>{wordmark}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * A page's share image: a headline and an optional line under it. `wordmark` is the
 * name beside the F-mark: the brand by default; the app's pages pass their configured name.
 */
export function OGLayout({ headline, subtitle, wordmark }: { headline: string; subtitle?: string; wordmark?: string }) {
  return (
    <Frame wordmark={wordmark}>
      <div
        style={{
          display: 'flex',
          marginTop: 64,
          maxWidth: 1000,
          fontSize: 76,
          fontWeight: 600,
          lineHeight: 1.06,
          letterSpacing: '-0.035em',
          textShadow: '0 2px 24px rgba(3,37,99,0.35)',
        }}
      >
        {headline}
      </div>
      {subtitle ? (
        <div style={{ display: 'flex', marginTop: 24, maxWidth: 900, fontFamily: 'Inter', fontSize: 30, lineHeight: 1.35, color: 'rgba(255,255,255,0.92)' }}>
          {subtitle}
        </div>
      ) : null}
    </Frame>
  );
}

/** A blog post's share image: its category, its title (up to three lines) and the byline. */
export function OGPostLayout({ category, title, byline }: { category: string; title: string; byline: string }) {
  return (
    <Frame>
      <div
        style={{
          display: 'flex',
          marginTop: 44,
          padding: '7px 18px',
          borderRadius: 40,
          border: '1px solid rgba(255,255,255,0.4)',
          backgroundColor: 'rgba(255,255,255,0.14)',
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        {category}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 26,
          maxWidth: 1040,
          fontSize: 60,
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          textShadow: '0 2px 24px rgba(3,37,99,0.35)',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', marginTop: 26, fontFamily: 'Inter', fontSize: 26, color: 'rgba(255,255,255,0.92)' }}>{byline}</div>
    </Frame>
  );
}

/** The dashboard shot's pixel size (public/landing/dashboard.jpg, the hero's product image). */
const SHOT = { src: 'landing/dashboard.jpg', width: 1960, height: 1208 };
/** Width of the shot in the card; the card's foot cuts it about two-thirds of the way down, as the hero does. */
const SHOT_WIDTH = 960;

/**
 * The homepage's share image: the hero in miniature. The headline and a line
 * under it, then the Fluxberry dashboard in the hero's frosted-glass frame,
 * running off the card's foot.
 */
export function OGHeroLayout({ headline, subtitle }: { headline: string; subtitle: string }) {
  return (
    <Frame top={36}>
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          marginTop: 26,
          fontSize: 60,
          fontWeight: 600,
          lineHeight: 1.06,
          letterSpacing: '-0.035em',
          textShadow: '0 2px 24px rgba(3,37,99,0.35)',
        }}
      >
        {headline}
      </div>
      <div style={{ display: 'flex', flexShrink: 0, marginTop: 14, fontFamily: 'Inter', fontSize: 24, color: 'rgba(255,255,255,0.92)' }}>{subtitle}</div>
      {/* The hero's glass frame (no backdrop blur in the renderer, so a white tint and a hairline stand in). */}
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          marginTop: 30,
          padding: 10,
          borderRadius: 24,
          backgroundColor: 'rgba(255,255,255,0.25)',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 24px 60px -20px rgba(3,37,99,0.45)',
        }}
      >
        <div style={{ display: 'flex', flexShrink: 0, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fcfcfd' }}>
          <img
            src={publicAssetDataUri(SHOT.src)}
            width={SHOT_WIDTH}
            height={Math.round((SHOT_WIDTH * SHOT.height) / SHOT.width)}
            alt=""
          />
        </div>
      </div>
    </Frame>
  );
}
