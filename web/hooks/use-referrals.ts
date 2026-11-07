'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReferralDto, CreateReferralInput, UpdateReferralRewardInput } from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useMyReferrals() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['referrals', currentWorkspace.id, 'mine'],
    queryFn: () => api.get<ReferralDto[]>('/api/v1/referrals/my'),
  });
}

export function useCreateReferral() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReferralInput) => api.post<ReferralDto>('/api/v1/referrals', input),
    // Invalidate the shared workspace prefix, not just 'mine' — an admin
    // viewing the reward table on the same page needs the new link too.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['referrals', currentWorkspace.id] }),
  });
}

export function useWorkspaceReferrals() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['referrals', currentWorkspace.id, 'all'],
    queryFn: () => api.get<ReferralDto[]>(`/api/v1/workspaces/${currentWorkspace.id}/referrals`),
  });
}

export function useUpdateReferralReward() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ referralId, input }: { referralId: string; input: UpdateReferralRewardInput }) =>
      api.patch<ReferralDto>(`/api/v1/workspaces/${currentWorkspace.id}/referrals/${referralId}/reward`, input),
    // Same shared-prefix invalidation — a member's own referral badge should
    // reflect a reward status change too.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['referrals', currentWorkspace.id] }),
  });
}
