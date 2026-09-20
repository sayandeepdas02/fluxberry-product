import type { PublicCareersJob } from '@fluxberry/shared';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '@/lib/labels';
import { formatSalary } from '@/lib/utils';

export function CareersJobs({
  jobs,
  appUrl = '',
  target,
  accentColor,
  source = 'CAREERS_PAGE',
}: {
  jobs: PublicCareersJob[];
  appUrl?: string;
  target?: '_blank';
  accentColor?: string | null;
  source?: string;
}) {
  if (!jobs.length) {
    return <p className="text-sm text-muted-foreground">No open roles right now — check back soon.</p>;
  }
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {jobs.map((j) => {
        const salary = formatSalary(j.salary);
        const meta = [j.location, EMPLOYMENT_LABELS[j.employmentType], WORK_MODE_LABELS[j.workMode]]
          .filter(Boolean)
          .join(' · ');
        return (
          <a
            key={j.applyPath}
            href={`${appUrl}${j.applyPath}?source=${source}`}
            target={target}
            rel="noreferrer"
            className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0">
              <div className="font-medium text-foreground">{j.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {meta}
                {salary ? ` · ${salary}` : ''}
              </div>
            </div>
            <span className="shrink-0 text-sm font-medium" style={accentColor ? { color: accentColor } : undefined}>
              View →
            </span>
          </a>
        );
      })}
    </div>
  );
}
