import type { PublicCareersJob } from '@fluxberry/shared';
import { CareersJobs } from './careers-jobs';

export function JobsByDepartment({ jobs, appUrl, accentColor }: { jobs: PublicCareersJob[]; appUrl: string; accentColor?: string | null }) {
  const grouped = new Map<string, PublicCareersJob[]>();
  for (const job of jobs) {
    const dept = job.department || 'Other';
    if (!grouped.has(dept)) grouped.set(dept, []);
    grouped.get(dept)!.push(job);
  }
  if (grouped.size <= 1) {
    return <CareersJobs jobs={jobs} appUrl={appUrl} accentColor={accentColor} />;
  }
  const sorted = [...grouped.entries()].sort((a, b) => {
    if (a[0] === 'Other') return 1;
    if (b[0] === 'Other') return -1;
    return a[0].localeCompare(b[0]);
  });
  return (
    <div className="space-y-6">
      {sorted.map(([dept, deptJobs]) => (
        <div key={dept}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">{dept}</h3>
          <CareersJobs jobs={deptJobs} appUrl={appUrl} accentColor={accentColor} />
        </div>
      ))}
    </div>
  );
}
