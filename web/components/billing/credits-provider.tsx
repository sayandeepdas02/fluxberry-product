'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getInsufficientCredits } from '@/lib/api-client';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { OutOfCreditsModal } from './out-of-credits-modal';

type Shortfall = { needed?: number; available?: number };

const CreditsContext = createContext<((err: unknown) => boolean) | null>(null);

/**
 * Mounts one OutOfCreditsModal for the whole dashboard. Any spend that fails
 * with INSUFFICIENT_CREDITS (402) goes through `useCreditErrorHandler()`, so
 * every feature shows the same out-of-credits experience.
 */
export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [shortfall, setShortfall] = useState<Shortfall | null>(null);

  const handle = useCallback(
    (err: unknown) => {
      const details = getInsufficientCredits(err);
      if (!details) return false;
      setShortfall(details);
      void queryClient.invalidateQueries({ queryKey: ['billing'] });
      return true;
    },
    [queryClient],
  );

  const canBuy = currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin';
  const value = useMemo(() => handle, [handle]);

  return (
    <CreditsContext.Provider value={value}>
      {children}
      <OutOfCreditsModal
        open={shortfall != null}
        onOpenChange={(o) => !o && setShortfall(null)}
        needed={shortfall?.needed}
        available={shortfall?.available}
        canBuy={canBuy}
      />
    </CreditsContext.Provider>
  );
}

/**
 * Returns `handle(err)`: opens the out-of-credits modal and returns true for a
 * 402 INSUFFICIENT_CREDITS error, false otherwise (so the caller can toast it).
 *
 *   onError: (err) => { if (!handleCreditError(err)) toast.error('Something went wrong'); }
 */
export function useCreditErrorHandler(): (err: unknown) => boolean {
  const ctx = useContext(CreditsContext);
  return ctx ?? getInsufficientCreditsFallback;
}

const getInsufficientCreditsFallback = (err: unknown) => Boolean(getInsufficientCredits(err));
