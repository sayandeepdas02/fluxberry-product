import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import { JOB_STATUSES, EMPLOYMENT_TYPES, WORK_MODES } from '../shared';

const jobSkillSchema = new Schema(
  {
    name: { type: String, required: true },
    required: { type: Boolean, default: true },
    weight: { type: Number, default: 1 },
  },
  { _id: false },
);

const structuredRequirementsSchema = new Schema(
  {
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    responsibilities: { type: [String], default: [] },
    education: { type: [String], default: [] },
    experience: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
  },
  { _id: false },
);

const pipelineStageSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    system: { type: Boolean, default: false },
    terminal: { type: Boolean, default: false },
  },
  { _id: false },
);

const jobSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    department: { type: String, default: null, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: JOB_STATUSES, default: 'DRAFT' },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'FULL_TIME' },
    workMode: { type: String, enum: WORK_MODES, default: 'ONSITE' },
    location: { type: String, default: null },
    openings: { type: Number, default: 1 },
    salary: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: 'INR' },
    },
    experience: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
    skills: { type: [jobSkillSchema], default: [] },
    structuredRequirements: { type: structuredRequirementsSchema, default: null },
    /** null = use the 7 system default stages; set once a job customizes its pipeline. */
    stages: { type: [pipelineStageSchema], default: null },
    /** Empty = visible to every workspace member (today's default); non-empty scopes visibility to these users. */
    restrictedTo: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    applicationFormId: { type: Schema.Types.ObjectId, ref: 'ApplicationForm', default: null },
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', default: null },
    interviewConfigId: { type: Schema.Types.ObjectId, ref: 'AiInterviewConfig', default: null },
    // AI generation provenance (spec §16, §152)
    rawGenerationPrompt: { type: String, default: null },
    generatedDescription: { type: String, default: null },
    aiMeta: {
      provider: { type: String, default: null },
      model: { type: String, default: null },
      promptVersion: { type: String, default: null },
      generatedAt: { type: Date, default: null },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    /**
     * Manual "I posted this to LinkedIn" tracking (Phase 3.2). There's no
     * automated cross-posting here — LinkedIn's job-posting API needs Talent
     * Solutions partnership access we don't have, so this just remembers the
     * pre-filled share link was used; status derives from this + job.status.
     */
    linkedInPostedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'jobs' },
);

jobSchema.index({ workspaceId: 1, status: 1 });
jobSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });

export type JobDoc = InferSchemaType<typeof jobSchema>;
export const JobModel = (models.Job as Model<JobDoc>) || model<JobDoc>('Job', jobSchema);
