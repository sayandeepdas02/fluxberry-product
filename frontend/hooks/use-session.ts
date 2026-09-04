'use client';

import { useQuery } from '@tanstack/react-query';
import type { SessionDto } from '@fluxberry/shared';
import { api } from '@/lib/api-client';

/** Loads the current session (user + workspaces). Returns null data when logged out. */
export function useSession() {
  return useQuery<SessionDto | null>({
    queryKey: ['session'],
    queryFn: async () => {
      return api.get<SessionDto>('/api/v1/auth/me');
    },
    retry: false,
    staleTime: 60_000,
  });
}
