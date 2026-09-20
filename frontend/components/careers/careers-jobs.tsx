import type { PublicCareersJob } from '@fluxberry/shared';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '@/lib/labels';
import { formatSalary } from '@/lib/utils';

/**
 * The core "open roles" list — shared by the public careers page and the
 * embeddable widget. `target="_blank"` is used inside the iframe embed so apply
 * links open in a new tab instead of navigating the iframe.
 */
export function CareersJobs({
  jobs,
  appUrl = '',
  target,
}: {
  jobs: PublicCareersJob[];
  appUrl?: string;
  target?: '_blank';
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
            href={`${appUrl}${j.applyPath}`}
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
            <span className="shrink-0 text-sm font-medium text-primary">Apply →</span>
          </a>
        );
      })}
    </div>
  );
}
