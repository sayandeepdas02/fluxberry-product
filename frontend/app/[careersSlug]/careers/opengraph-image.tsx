import { ImageResponse } from 'next/og';
import { fetchPublicCareers } from '@/lib/public-api';

export const runtime = 'edge';
export const alt = 'Careers page';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function OGImage({ params }: { params: Promise<{ careersSlug: string }> }) {
  const { careersSlug } = await params;
  const data = await fetchPublicCareers(careersSlug);
  if (!data) return new Response('Not found', { status: 404 });

  const jobCount = data.openings.length;
  const accentColor = data.accentColor || '#7c3aed';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
          height: '100%',
          padding: '80px',
          backgroundColor: '#fafafa',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          {data.company.logoUrl && (
            <img
              src={data.company.logoUrl}
              width={64}
              height={64}
              style={{ borderRadius: '12px', objectFit: 'cover' }}
            />
          )}
          <span style={{ fontSize: '28px', color: '#71717a' }}>{data.company.name}</span>
        </div>
        <div style={{ fontSize: '48px', fontWeight: 700, color: '#18181b', lineHeight: 1.2, maxWidth: '900px' }}>
          {data.headline || `Join ${data.company.name}`}
        </div>
        {data.tagline && (
          <div style={{ fontSize: '24px', color: '#71717a', marginTop: '16px', maxWidth: '800px' }}>
            {data.tagline}
          </div>
        )}
        {jobCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '32px',
              fontSize: '22px',
              fontWeight: 600,
              color: accentColor,
            }}
          >
            {jobCount} open {jobCount === 1 ? 'role' : 'roles'}
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '6px',
            backgroundColor: accentColor,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
