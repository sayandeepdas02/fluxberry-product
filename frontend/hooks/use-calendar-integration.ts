'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CalendarConnectionStatusDto } from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useCalendarConnectionStatus() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['calendar-connection', currentWorkspace.id],
    queryFn: () => api.get<CalendarConnectionStatusDto>('/api/v1/integrations/google-calendar/status'),
  });
}

/** Fetches the Google OAuth consent URL and navigates the browser there. */
export function useConnectCalendar() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await api.get<{ url: string }>('/api/v1/integrations/google-calendar/connect');
      return url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.del('/api/v1/integrations/google-calendar'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connection'] });
    },
  });
}
