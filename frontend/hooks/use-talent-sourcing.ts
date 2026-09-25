'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  SourcingCriteria,
  SourcingSearchResultDto,
  SourcingSearchDto,
  SourcedContactDto,
  SourcingParseResultDto,
  SourcingListDto,
  Paginated,
  CreateListInput,
  UpdateListInput,
  SourcingCampaignDto,
  SourcingCampaignRecipientDto,
  CreateCampaignInput,
  UpdateCampaignInput,
  DraftCampaignInput,
  CampaignDraftDto,
} from '@/lib/shared';
import { api, getAccessToken, getWorkspaceId } from '@/lib/api-client';
import { publicConfig } from '@/lib/config';
import { useWorkspace } from '@/components/providers/workspace-provider';

/** Free step: prompt → editable criteria (no PDL / credit spend). */
export function useParsePrompt() {
  return useMutation({
    mutationFn: (prompt: string) =>
      api.post<SourcingParseResultDto>('/api/v1/sourcing/parse', { prompt }),
  });
}

/** Run a new search. Spends SOURCING_SEARCH credits, so refresh the balance after. */
export function useRunSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { prompt: string; criteria?: SourcingCriteria }) =>
      api.post<SourcingSearchResultDto>('/api/v1/sourcing/search', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sourcing', 'searches'] });
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

/** Fetch the next page of an existing search (costs credits). */
export function useLoadMore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (searchId: string) =>
      api.post<SourcingSearchResultDto>(`/api/v1/sourcing/searches/${searchId}/more`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}

/** Re-run a search with recruiter-edited criteria (no AI re-parse; costs credits). */
export function useUpdateCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { searchId: string; criteria: SourcingCriteria }) =>
      api.patch<SourcingSearchResultDto>(`/api/v1/sourcing/searches/${v.searchId}/criteria`, {
        criteria: v.criteria,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sourcing', 'searches'] });
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

/** Recent searches for the "pick up where you left off" list. */
export function useSearches() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['sourcing', 'searches', currentWorkspace.id],
    queryFn: () => api.get<SourcingSearchDto[]>('/api/v1/sourcing/searches'),
  });
}

/** Rehydrate a saved search's results. */
export async function fetchSearch(searchId: string): Promise<SourcingSearchResultDto> {
  return api.get<SourcingSearchResultDto>(`/api/v1/sourcing/searches/${searchId}`);
}

/** Full profile with email/phone revealed. */
export function useContact(contactId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['sourcing', 'contact', currentWorkspace.id, contactId],
    queryFn: () => api.get<SourcedContactDto>(`/api/v1/sourcing/contacts/${contactId}`),
    enabled: Boolean(contactId),
  });
}

// ---- Contacts (durable people store) --------------------------------------

export interface ContactFilters {
  page?: number;
  limit?: number;
  search?: string;
  hasEmail?: boolean;
}

export function useContacts(filters: ContactFilters) {
  const { currentWorkspace } = useWorkspace();
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v));
  });
  return useQuery({
    queryKey: ['sourcing', 'contacts', currentWorkspace.id, filters],
    queryFn: () => api.get<Paginated<SourcedContactDto>>(`/api/v1/sourcing/contacts?${qs.toString()}`),
  });
}

export function useConvertContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string; jobId: string }) =>
      api.post<SourcedContactDto>(`/api/v1/sourcing/contacts/${v.contactId}/convert`, { jobId: v.jobId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sourcing', 'contacts'] });
      qc.invalidateQueries({ queryKey: ['sourcing', 'contact'] });
      qc.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

// ---- Lists (talent pools) -------------------------------------------------

export function useLists() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['sourcing', 'lists', currentWorkspace.id],
    queryFn: () => api.get<SourcingListDto[]>('/api/v1/sourcing/lists'),
  });
}

export function useList(listId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['sourcing', 'list', currentWorkspace.id, listId],
    queryFn: () => api.get<SourcingListDto>(`/api/v1/sourcing/lists/${listId}`),
    enabled: Boolean(listId),
  });
}

export function useListMembers(listId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['sourcing', 'list-members', currentWorkspace.id, listId],
    queryFn: () => api.get<SourcedContactDto[]>(`/api/v1/sourcing/lists/${listId}/contacts`),
    enabled: Boolean(listId),
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateListInput) => api.post<SourcingListDto>('/api/v1/sourcing/lists', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sourcing', 'lists'] }),
  });
}

export function useUpdateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { listId: string; input: UpdateListInput }) =>
      api.patch<SourcingListDto>(`/api/v1/sourcing/lists/${v.listId}`, v.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sourcing', 'lists'] });
      qc.invalidateQueries({ queryKey: ['sourcing', 'list'] });
    },
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => api.del<void>(`/api/v1/sourcing/lists/${listId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sourcing', 'lists'] }),
  });
}

export function useAddToList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { listId: string; contactIds: string[] }) =>
      api.post<SourcingListDto>(`/api/v1/sourcing/lists/${v.listId}/contacts`, { contactIds: v.contactIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sourcing', 'lists'] });
      qc.invalidateQueries({ queryKey: ['sourcing', 'list'] });
      qc.invalidateQueries({ queryKey: ['sourcing', 'list-members'] });
    },
  });
}

export function useRemoveFromList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { listId: string; contactId: string }) =>
      api.del<SourcingListDto>(`/api/v1/sourcing/lists/${v.listId}/contacts/${v.contactId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sourcing', 'lists'] });
      qc.invalidateQueries({ queryKey: ['sourcing', 'list'] });
      qc.invalidateQueries({ queryKey: ['sourcing', 'list-members'] });
    },
  });
}

// ---- Campaigns (single-shot outreach) -------------------------------------

export function useCampaigns() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['sourcing', 'campaigns', currentWorkspace.id],
    queryFn: () => api.get<SourcingCampaignDto[]>('/api/v1/sourcing/campaigns'),
  });
}

export function useCampaign(campaignId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['sourcing', 'campaign', currentWorkspace.id, campaignId],
    queryFn: () => api.get<SourcingCampaignDto>(`/api/v1/sourcing/campaigns/${campaignId}`),
    enabled: Boolean(campaignId),
    // Poll while a send is in flight so stats update live.
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === 'SENDING' || s === 'SCHEDULED' ? 5000 : false;
    },
  });
}

export function useCampaignRecipients(campaignId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['sourcing', 'recipients', currentWorkspace.id, campaignId],
    queryFn: () => api.get<SourcingCampaignRecipientDto[]>(`/api/v1/sourcing/campaigns/${campaignId}/recipients`),
    enabled: Boolean(campaignId),
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => api.post<SourcingCampaignDto>('/api/v1/sourcing/campaigns', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sourcing', 'campaigns'] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { campaignId: string; input: UpdateCampaignInput }) =>
      api.patch<SourcingCampaignDto>(`/api/v1/sourcing/campaigns/${v.campaignId}`, v.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sourcing', 'campaigns'] });
      qc.invalidateQueries({ queryKey: ['sourcing', 'campaign'] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => api.del<void>(`/api/v1/sourcing/campaigns/${campaignId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sourcing', 'campaigns'] }),
  });
}

export function useTestCampaign() {
  return useMutation({
    mutationFn: (v: { campaignId: string; toEmail: string }) =>
      api.post<{ ok: boolean }>(`/api/v1/sourcing/campaigns/${v.campaignId}/test`, { toEmail: v.toEmail }),
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { campaignId: string; scheduledAt?: string }) =>
      api.post<SourcingCampaignDto>(`/api/v1/sourcing/campaigns/${v.campaignId}/send`, { scheduledAt: v.scheduledAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sourcing', 'campaigns'] });
      qc.invalidateQueries({ queryKey: ['sourcing', 'campaign'] });
    },
  });
}

export function useDraftEmail() {
  return useMutation({
    mutationFn: (input: DraftCampaignInput) => api.post<CampaignDraftDto>('/api/v1/sourcing/campaigns/draft', input),
  });
}

/**
 * Download a CSV export of the given contacts. The endpoint returns a raw file
 * (not the JSON envelope), so this bypasses the `api` client and streams a blob.
 */
export async function downloadContactsCsv(contactIds: string[]): Promise<void> {
  const [token, workspaceId] = [await getAccessToken(), getWorkspaceId()];
  const res = await fetch(`${publicConfig.apiUrl}/api/v1/sourcing/contacts/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
    },
    body: JSON.stringify({ contactIds }),
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sourced-contacts.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
