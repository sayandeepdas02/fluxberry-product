import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Don't retry auth/permission/validation errors.
          if (error instanceof ApiError && [400, 401, 403, 404, 422].includes(error.status)) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
