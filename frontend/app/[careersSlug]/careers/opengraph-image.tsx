import { fetchPublicCareers } from '@/lib/public-api';
import { OG_SIZE, OGLayout, ogImage } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Open roles, powered by Fluxberry';

type Params = Promise<{ careersSlug: string }>;

export default async function OpengraphImage({ params }: { params: Params }) {
  const { careersSlug } = await params;
  const data = await fetchPublicCareers(careersSlug).catch(() => null);
  const company = data?.company.name;

  return ogImage(<OGLayout headline={company ? `${company} is hiring` : 'Open roles'} subtitle="Explore open roles, powered by Fluxberry." />);
}
