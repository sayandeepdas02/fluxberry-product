import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon: same mark as `icon.tsx`, padded on a white background (iOS handles transparency poorly). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            width: '65%',
            height: '65%',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ width: '50%', height: '50%', background: '#ec4899' }} />
          <div style={{ width: '50%', height: '50%', background: '#fbcfe8' }} />
          <div style={{ width: '50%', height: '50%', background: '#fbcfe8' }} />
          <div style={{ width: '50%', height: '50%', background: '#be185d' }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
