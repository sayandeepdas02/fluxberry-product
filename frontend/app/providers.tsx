'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
