'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { BillingStatusDto, CreateCheckoutInput } from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useBillingStatus() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['billing', currentWorkspace.id],
    queryFn: () => api.get<BillingStatusDto>(`/api/v1/workspaces/${currentWorkspace.id}/billing`),
  });
}

export function useCreateCheckout() {
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (input: CreateCheckoutInput) =>
      api.post<{ url: string }>(`/api/v1/workspaces/${currentWorkspace.id}/billing/checkout`, input),
  });
}

export function useCreatePortalSession() {
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: () => api.post<{ url: string }>(`/api/v1/workspaces/${currentWorkspace.id}/billing/portal`),
  });
}
