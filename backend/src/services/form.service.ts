import { DEFAULT_FORM_FIELDS, type ApplicationFormDto, type FormQuestion } from '../shared';
import { formRepository } from '../repositories/form.repository';
import { jobRepository } from '../repositories/job.repository';
import { toFormDto } from '../serializers/form.serializer';
import { shortId } from '../utils/ids';
import { notFound } from '../utils/errors';

function buildDefaultQuestions() {
  return DEFAULT_FORM_FIELDS.map((f, i) => ({
    id: shortId(),
    key: f.key,
    type: f.type,
    label: f.label,
    description: null,
    required: f.required,
    enabled: true,
    options: [],
    sortOrder: i,
    system: true,
  }));
}

export const formService = {
  /** Get the job's form, creating a default one on first access (spec §18). */
  async getOrCreate(workspaceId: string, jobId: string): Promise<ApplicationFormDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');

    let form = await formRepository.findByJob(jobId);
    if (!form) {
      form = await formRepository.create({
        workspaceId,
        jobId,
        questions: buildDefaultQuestions(),
      });
      if (!job.applicationFormId) {
        await jobRepository.update(jobId, { applicationFormId: form._id });
      }
    }
    return toFormDto(form.toObject());
  },

  async update(
    workspaceId: string,
    jobId: string,
    questions: FormQuestion[],
  ): Promise<ApplicationFormDto> {
    const job = await jobRepository.findInWorkspace(workspaceId, jobId);
    if (!job) throw notFound('Job not found');
    // Ensure the form exists first.
    await this.getOrCreate(workspaceId, jobId);

    const normalized = questions.map((q, i) => ({
      id: q.id || shortId(),
      key: q.key ?? null,
      type: q.type,
      label: q.label,
      description: q.description ?? null,
      required: q.required,
      enabled: q.enabled,
      options: q.options ?? [],
      sortOrder: i,
      system: q.system ?? false,
      variant: q.variant ?? null,
      linkPlatform: q.linkPlatform ?? null,
    }));

    const form = await formRepository.setQuestions(jobId, normalized);
    return toFormDto(form!.toObject());
  },

  /** Public-facing: only enabled questions, sorted. Does not persist a form. */
  async getPublicQuestions(jobId: string): Promise<FormQuestion[]> {
    const form = await formRepository.findByJob(jobId);
    const questions: FormQuestion[] = form
      ? toFormDto(form.toObject()).questions
      : buildDefaultQuestions().map((q) => ({
          id: q.id,
          key: q.key,
          type: q.type,
          label: q.label,
          description: undefined,
          required: q.required,
          enabled: q.enabled,
          options: [],
          sortOrder: q.sortOrder,
          system: q.system,
        }));
    return questions.filter((q) => q.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  },
};
