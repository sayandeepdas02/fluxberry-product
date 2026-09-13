'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface CandidateListContextValue {
  ids: string[];
  setIds: (ids: string[]) => void;
}

const noopSetIds = () => {};
const CandidateListContext = createContext<CandidateListContextValue>({ ids: [], setIds: noopSetIds });

/**
 * Shares the current candidates list's ordered candidate ids between the list
 * page and the candidate-detail modal that intercepts navigation over it, so
 * the modal can compute prev/next without re-fetching or re-deriving filters
 * (spec item 4.1). Provided by `candidates/layout.tsx`; components rendered
 * outside that layout (e.g. a job-scoped candidates tab) get a harmless no-op.
 */
export function CandidateListProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIdsState] = useState<string[]>([]);
  const setIds = useCallback((next: string[]) => {
    setIdsState((prev) => (prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next));
  }, []);
  const value = useMemo(() => ({ ids, setIds }), [ids, setIds]);
  return <CandidateListContext.Provider value={value}>{children}</CandidateListContext.Provider>;
}

export function useCandidateListIds() {
  return useContext(CandidateListContext);
}
