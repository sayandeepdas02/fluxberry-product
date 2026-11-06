'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CandidateListItemDto,
  CandidateProfileDto,
  Paginated,
  TimelineEntryDto,
  ApplicationDto,
  RejectApplicationInput,
  ApplicationAnswersDto,
  CandidateDto,
  BulkActionInput,
} from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export interface CandidateFilters {
  jobId?: string;
  stage?: string;
  labelId?: string;
  minScore?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'appliedAt' | 'score' | 'name' | 'expectedSalary';
  order?: 'asc' | 'desc';
}

function toQuery(f: CandidateFilters): string {
  const qs = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
  });
  return qs.toString();
}

export function useCandidates(filters: CandidateFilters) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['candidates', currentWorkspace.id, filters],
    queryFn: () => api.get<Paginated<CandidateListItemDto>>(`/api/v1/candidates?${toQuery(filters)}`),
  });
}

export function useCandidateProfile(candidateId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['candidate', currentWorkspace.id, candidateId],
    queryFn: () => api.get<CandidateProfileDto>(`/api/v1/candidates/${candidateId}`),
    enabled: Boolean(candidateId),
    // Poll while any application's screening is in progress so the score appears automatically,
    // regardless of which application tab the recruiter currently has selected.
    refetchInterval: (query) => {
      const apps = query.state.data?.applications ?? [];
      const anyPending = apps.some(
        (a) => a.screeningResult?.status === 'PENDING' || a.screeningResult?.status === 'PROCESSING',
      );
      return anyPending ? 3000 : false;
    },
  });
}

export function useApplicationDetail(applicationId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['application', currentWorkspace.id, applicationId],
    queryFn: () =>
      api.get<{ application: ApplicationDto & { jobTitle: string }; candidate: CandidateDto | null; answers: ApplicationAnswersDto }>(
        `/api/v1/applications/${applicationId}`,
      ),
    enabled: Boolean(applicationId),
  });
}

export function useApplicationTimeline(applicationId: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['timeline', currentWorkspace.id, applicationId],
    queryFn: () => api.get<TimelineEntryDto[]>(`/api/v1/applications/${applicationId}/timeline`),
    enabled: Boolean(applicationId),
  });
}

function useAppMutation<TBody>(path: (id: string) => string, opts: { spendsCredits?: boolean } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { applicationId: string; body?: TBody }) =>
      api.post<ApplicationDto>(path(v.applicationId), v.body),
    onSettled: () => {
      if (opts.spendsCredits) void queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate'] });
      queryClient.invalidateQueries({ queryKey: ['application'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      // Settle only once the candidate lists have refetched, so a caller that
      // shows the change ahead of time (the Kanban board) can hand back to the
      // server's data without the card flashing back to its old column.
      return queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useMoveStage() {
  return useAppMutation<{ stage: string; note?: string }>((id) => `/api/v1/applications/${id}/stage`);
}
export function useShortlist() {
  return useAppMutation<undefined>((id) => `/api/v1/applications/${id}/shortlist`);
}
export function useHire() {
  return useAppMutation<undefined>((id) => `/api/v1/applications/${id}/hire`);
}
export function useReject() {
  return useAppMutation<RejectApplicationInput>((id) => `/api/v1/applications/${id}/reject`);
}
/** Re-screen (or screen a waiting applicant) — may spend an APPLICANT_SCREENING credit. */
export function useRescreen() {
  return useAppMutation<undefined>((id) => `/api/v1/applications/${id}/rescreen`, { spendsCredits: true });
}

export function useBulkAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkActionInput) =>
      api.post<{ succeeded: number; failed: number; skipped: number }>('/api/v1/applications/bulk-action', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export async function fetchResumeUrl(
  candidateId: string,
  disposition: 'inline' | 'attachment' = 'inline',
): Promise<string> {
  const { url } = await api.get<{ url: string }>(
    `/api/v1/candidates/${candidateId}/resume-url?disposition=${disposition}`,
  );
  return url;
}

export async function fetchAnswerFileUrl(
  applicationId: string,
  questionId: string,
  disposition: 'inline' | 'attachment' = 'inline',
): Promise<string> {
  const { url } = await api.get<{ url: string }>(
    `/api/v1/applications/${applicationId}/answers/${questionId}/file-url?disposition=${disposition}`,
  );
  return url;
}
