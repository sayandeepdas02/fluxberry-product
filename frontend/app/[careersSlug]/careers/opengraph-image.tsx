import { fetchPublicCareers } from '@/lib/public-api';
import { publicConfig } from '@/lib/config';
import { OG_SIZE, OGLayout, ogImage } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Params = Promise<{ careersSlug: string }>;

export default async function OpengraphImage({ params }: { params: Params }) {
  const { careersSlug } = await params;
  const data = await fetchPublicCareers(careersSlug).catch(() => null);

  const subtitle = data?.company.name
    ? `${data.company.name} is hiring — explore open roles.`
    : 'Explore open roles powered by Fluxberry AI.';

  return ogImage(<OGLayout wordmark={publicConfig.appName} headline="AI Native Hiring Platform" subtitle={subtitle} />);
}
