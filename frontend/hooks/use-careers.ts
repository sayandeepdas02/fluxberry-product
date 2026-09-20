'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CareersPageDto, UpdateCareersInput } from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function useCareers() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['careers', currentWorkspace.id],
    queryFn: () => api.get<CareersPageDto>('/api/v1/careers'),
  });
}

export function useUpdateCareers() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCareersInput) => api.put<CareersPageDto>('/api/v1/careers', input),
    onSuccess: (page) => queryClient.setQueryData(['careers', currentWorkspace.id], page),
  });
}

export function useSetCareersSlug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.post<{ slug: string }>('/api/v1/careers/slug', { slug }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['careers'] }),
  });
}

export function useGeneratePreviewToken() {
  return useMutation({
    mutationFn: () => api.post<{ token: string; expiresAt: number }>('/api/v1/careers/preview-token'),
  });
}

export function useUploadCoverImage() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('coverImage', file);
      return api.post<CareersPageDto>('/api/v1/careers/cover-image', fd);
    },
    onSuccess: (page) => queryClient.setQueryData(['careers', currentWorkspace.id], page),
  });
}

export function checkCareersSlug(slug: string): Promise<{ available: boolean; reason?: string }> {
  return api.get<{ available: boolean; reason?: string }>(
    `/api/v1/careers/slug-available?slug=${encodeURIComponent(slug)}`,
  );
}
