'use client';

import { use } from 'react';
import { ListDetail } from '@/components/talent-sourcing/list-detail';

export default function SourcingListDetailPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = use(params);
  return <ListDetail listId={listId} />;
}
