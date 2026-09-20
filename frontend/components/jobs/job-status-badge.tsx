import type { JobStatus } from '@/lib/shared';
import { Badge } from '@/components/ui/badge';

const MAP: Record<JobStatus, { label: string; variant: 'success' | 'muted' | 'warning' | 'primary' }> = {
  DRAFT: { label: 'Draft', variant: 'muted' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  PAUSED: { label: 'Paused', variant: 'warning' },
  CLOSED: { label: 'Closed', variant: 'muted' },
  ARCHIVED: { label: 'Archived', variant: 'muted' },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const s = MAP[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
