'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
};

type NotificationsResponse = { items: NotificationDto[]; unread: number };

export function useNotifications() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['notifications', currentWorkspace.id],
    queryFn: () => api.get<NotificationsResponse>('/api/v1/notifications'),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', currentWorkspace.id] }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: () => api.post('/api/v1/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', currentWorkspace.id] }),
  });
}
