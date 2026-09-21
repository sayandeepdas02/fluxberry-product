import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** Favicon rendered from the same four-square mark as `components/marketing/logo.tsx`. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ width: '50%', height: '50%', background: '#0e2f7e' }} />
        <div style={{ width: '50%', height: '50%', background: '#b8ccff' }} />
        <div style={{ width: '50%', height: '50%', background: '#b8ccff' }} />
        <div style={{ width: '50%', height: '50%', background: '#0a2462' }} />
      </div>
    ),
    { ...size },
  );
}
