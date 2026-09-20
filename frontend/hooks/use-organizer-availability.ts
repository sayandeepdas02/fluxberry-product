'use client';

import { useQuery } from '@tanstack/react-query';
import type { OrganizerAvailabilityDto } from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

/** Organizer's own busy/free blocks for one local calendar day (schedule-interview dialog hint). */
export function useOrganizerAvailability(dayStart: Date, enabled: boolean) {
  const { currentWorkspace } = useWorkspace();
  const timeMin = new Date(dayStart);
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + 1);

  return useQuery({
    queryKey: ['organizer-availability', currentWorkspace.id, timeMin.toISOString()],
    queryFn: () =>
      api.get<OrganizerAvailabilityDto>(
        `/api/v1/integrations/google-calendar/availability?timeMin=${encodeURIComponent(timeMin.toISOString())}&timeMax=${encodeURIComponent(timeMax.toISOString())}`,
      ),
    enabled,
    staleTime: 60_000,
  });
}
