import { connectDatabase, disconnectDatabase } from '../config/db';
import '../models'; // register all models
import { ApplicationFormModel } from '../models/application-form.model';
import { DEFAULT_FORM_FIELDS } from '../shared';
import { shortId } from '../utils/ids';
import { logger } from '../utils/logger';

/**
 * One-off backfill: appends the "linkedinUrl" default field to any
 * ApplicationForm persisted before it was added to DEFAULT_FORM_FIELDS.
 * Idempotent — safe to run repeatedly.
 */
async function main() {
  await connectDatabase();

  const field = DEFAULT_FORM_FIELDS.find((f) => f.key === 'linkedinUrl');
  if (!field) throw new Error('linkedinUrl is missing from DEFAULT_FORM_FIELDS');

  const cursor = ApplicationFormModel.find({ 'questions.key': { $ne: 'linkedinUrl' } }).cursor();
  let updated = 0;
  for await (const form of cursor) {
    const maxSortOrder = form.questions.reduce((m, q) => Math.max(m, q.sortOrder), -1);
    form.questions.push({
      id: shortId(),
      key: field.key,
      type: field.type,
      label: field.label,
      description: null,
      required: field.required,
      enabled: true,
      options: [],
      sortOrder: maxSortOrder + 1,
      system: true,
    });
    // eslint-disable-next-line no-await-in-loop
    await form.save();
    updated++;
  }

  logger.info({ updated }, 'Backfilled linkedinUrl field onto existing application forms');
  await disconnectDatabase();
}

main().catch((err) => {
  logger.error({ err }, 'Backfill failed');
  process.exit(1);
});
