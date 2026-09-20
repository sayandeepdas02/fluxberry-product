'use client';

import { useQuery } from '@tanstack/react-query';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlagState } from '@/lib/shared';
import { api } from '@/lib/api-client';

type MetaDto = { appName: string; features: FeatureFlagState; env: string };

/**
 * Reads backend feature flags from the public `/meta` endpoint. Cached for the
 * session; falls back to the shared defaults until it resolves so gated UI never
 * flashes on. Gate new coding/interview surfaces on these.
 */
export function useFeatures(): FeatureFlagState {
  const { data } = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.get<MetaDto>('/api/v1/meta', { public: true }),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  return data?.features ?? DEFAULT_FEATURE_FLAGS;
}

export function useFeature(flag: keyof FeatureFlagState): boolean {
  return useFeatures()[flag];
}
