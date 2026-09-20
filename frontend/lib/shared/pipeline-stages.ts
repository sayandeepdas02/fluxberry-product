import { APPLICATION_STAGES } from './enums';
import type { ApplicationStage } from './enums';
import type { PipelineStage } from './schemas/pipeline-stage';

/** Labels for the 7 built-in stages — single source of truth for both apps. */
export const SYSTEM_STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  ASSESSMENT: 'Assessment',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

/** The stage list every job starts with until it customizes its own. */
export function defaultPipelineStages(): PipelineStage[] {
  return APPLICATION_STAGES.map((id, index) => ({
    id,
    label: SYSTEM_STAGE_LABELS[id],
    color: null,
    sortOrder: index,
    system: true,
    terminal: id === 'REJECTED',
  }));
}
