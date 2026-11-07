'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { BillingStatusDto, CreateCheckoutInput, CreditsDto, CreditTransactionDto } from '@/lib/shared';
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

/** Start a one-time checkout to buy an AI-credit top-up pack. */
export function useBuyCreditPack() {
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: (packId: string) =>
      api.post<{ url: string }>(`/api/v1/workspaces/${currentWorkspace.id}/billing/credits/checkout`, { packId }),
  });
}

/**
 * The account's credit balance + screening quota. Readable by every member (not
 * just admins), so cost hints and the sidebar meter work for recruiters too.
 * Keyed under ['billing'] so existing `invalidateQueries(['billing'])` calls
 * after a spend refresh it.
 */
export function useCredits() {
  const { currentWorkspace } = useWorkspace();
  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'credits', currentWorkspace.id],
    queryFn: () => api.get<CreditsDto>(`/api/v1/workspaces/${currentWorkspace.id}/credits`),
  });
  return { credits: data ?? null, isLoading };
}

/** Recent credit ledger rows (admins only — the billing page). */
export function useCreditHistory(enabled = true) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['billing', 'credit-history', currentWorkspace.id],
    queryFn: () =>
      api.get<{ items: CreditTransactionDto[] }>(`/api/v1/workspaces/${currentWorkspace.id}/billing/credits/history`),
    enabled,
  });
}
