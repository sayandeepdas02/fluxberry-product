'use client';

import { use } from 'react';
import { CampaignPage } from '@/components/talent-sourcing/campaign-detail';

export default function CampaignDetailPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  return <CampaignPage campaignId={campaignId} />;
}
