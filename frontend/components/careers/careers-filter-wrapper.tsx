'use client';

import { useState, useMemo } from 'react';
import type { PublicCareersJob, WorkMode } from '@fluxberry/shared';
import { WORK_MODE_LABELS } from '@/lib/labels';
import { JobsByDepartment } from './careers-jobs-grouped';
import { cn } from '@/lib/utils';

type Filters = { workMode: WorkMode | null; location: string | null };

export function CareersFilterWrapper({ jobs, appUrl, accentColor }: { jobs: PublicCareersJob[]; appUrl: string; accentColor?: string | null }) {
  const [filters, setFilters] = useState<Filters>({ workMode: null, location: null });

  const workModes = useMemo(() => [...new Set(jobs.map((j) => j.workMode))], [jobs]);
  const locations = useMemo(() => [...new Set(jobs.map((j) => j.location).filter(Boolean))] as string[], [jobs]);

  const filtered = useMemo(
    () =>
      jobs.filter((j) => {
        if (filters.workMode && j.workMode !== filters.workMode) return false;
        if (filters.location && j.location !== filters.location) return false;
        return true;
      }),
    [jobs, filters],
  );

  const showFilters = workModes.length > 1 || locations.length > 1;

  const toggleWorkMode = (mode: WorkMode) =>
    setFilters((f) => ({ ...f, workMode: f.workMode === mode ? null : mode }));
  const toggleLocation = (loc: string) =>
    setFilters((f) => ({ ...f, location: f.location === loc ? null : loc }));

  return (
    <div>
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          {workModes.length > 1 &&
            workModes.map((mode) => (
              <button
                key={mode}
                onClick={() => toggleWorkMode(mode)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filters.workMode === mode
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {WORK_MODE_LABELS[mode]}
              </button>
            ))}
          {locations.length > 1 &&
            locations.map((loc) => (
              <button
                key={loc}
                onClick={() => toggleLocation(loc)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  filters.location === loc
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {loc}
              </button>
            ))}
        </div>
      )}
      <JobsByDepartment jobs={filtered} appUrl={appUrl} accentColor={accentColor} />
    </div>
  );
}
