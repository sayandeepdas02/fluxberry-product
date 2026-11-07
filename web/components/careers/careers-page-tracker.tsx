'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/posthog';

export function CareersPageTracker({ careersSlug }: { careersSlug: string }) {
  useEffect(() => {
    trackEvent('careers_page_viewed', { careers_slug: careersSlug });
  }, [careersSlug]);
  return null;
}
