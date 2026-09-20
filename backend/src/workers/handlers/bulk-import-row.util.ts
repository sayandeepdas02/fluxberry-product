import Papa from 'papaparse';
import { EMPLOYMENT_TYPES, WORK_MODES } from '@fluxberry/shared';
import type { BulkImportColumnMapping, BulkImportEntityType } from '@fluxberry/shared';

/** Shared CSV parsing/mapping/validation used by both the validate and process bulk-import workers. */

export function parseCsv(csvText: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

/** Maps a raw CSV row (keyed by original header) to target field names via the saved column mapping. */
export function applyMapping(
  row: Record<string, string>,
  columnMapping: BulkImportColumnMapping,
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [header, target] of Object.entries(columnMapping)) {
    if (!target) continue;
    const value = row[header];
    if (value != null && String(value).trim() !== '') mapped[target] = String(value).trim();
  }
  return mapped;
}

const EMPLOYMENT_TYPE_SET = new Set<string>(EMPLOYMENT_TYPES);
const WORK_MODE_SET = new Set<string>(WORK_MODES);

/** Validates one mapped row; returns a human-readable error per problem (empty array = valid). */
export function validateRow(entityType: BulkImportEntityType, mapped: Record<string, string>): string[] {
  const errors: string[] = [];

  if (entityType === 'candidate') {
    if (!mapped.name) errors.push('Missing required field: name');
    if (!mapped.email) errors.push('Missing required field: email');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) errors.push(`Invalid email address: ${mapped.email}`);
    return errors;
  }

  if (!mapped.title) errors.push('Missing required field: title');

  if (!mapped.employmentType) errors.push('Missing required field: employmentType');
  else if (!EMPLOYMENT_TYPE_SET.has(mapped.employmentType.toUpperCase())) {
    errors.push(`Invalid employmentType: ${mapped.employmentType}`);
  }

  if (!mapped.workMode) errors.push('Missing required field: workMode');
  else if (!WORK_MODE_SET.has(mapped.workMode.toUpperCase())) {
    errors.push(`Invalid workMode: ${mapped.workMode}`);
  }

  if (!mapped.openings) errors.push('Missing required field: openings');
  else if (!Number.isFinite(Number(mapped.openings)) || Number(mapped.openings) < 1) {
    errors.push(`Invalid openings: ${mapped.openings}`);
  }

  return errors;
}
