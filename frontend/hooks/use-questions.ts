'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QuestionDto, CreateQuestionInput, Paginated } from '@/lib/shared';
import { api } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';

export interface QuestionFilters {
  type?: 'MCQ' | 'CODING';
  category?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  skill?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useQuestions(filters: QuestionFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v != null && v !== '' && qs.set(k, String(v)));
  return useQuery({
    queryKey: ['questions', currentWorkspace.id, filters],
    queryFn: () => api.get<Paginated<QuestionDto>>(`/api/v1/questions?${qs.toString()}`),
  });
}

export function useQuestionCategories() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['question-categories', currentWorkspace.id],
    queryFn: () => api.get<string[]>('/api/v1/questions/categories'),
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuestionInput) => api.post<QuestionDto>('/api/v1/questions', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useUpdateQuestion(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuestionInput) => api.patch<QuestionDto>(`/api/v1/questions/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });
}

export function useArchiveQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/questions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });
}
