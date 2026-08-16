import { Schema, model, models, type InferSchemaType, type Model } from 'mongoose';
import {
  WORKFLOW_NODE_TYPES,
  WORKFLOW_STATUSES,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_STEP_STATUSES,
} from '@fluxberry/shared';

const nodeSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: WORKFLOW_NODE_TYPES, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    position: { x: { type: Number, default: 0 }, y: { type: Number, default: 0 } },
  },
  { _id: false },
);

const edgeSchema = new Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    branch: { type: String, default: null },
  },
  { _id: false },
);

/** One workflow per job; nodes/edges embedded for atomic edits (spec §49 simplified). */
const workflowSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },
    name: { type: String, default: 'Hiring workflow' },
    status: { type: String, enum: WORKFLOW_STATUSES, default: 'DRAFT' },
    nodes: { type: [nodeSchema], default: [] },
    edges: { type: [edgeSchema], default: [] },
  },
  { timestamps: true, collection: 'workflows' },
);

export type WorkflowDoc = InferSchemaType<typeof workflowSchema>;
export const WorkflowModel =
  (models.Workflow as Model<WorkflowDoc>) || model<WorkflowDoc>('Workflow', workflowSchema);

// ---- Runs & steps (grow per application) ----

const workflowRunSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    status: { type: String, enum: WORKFLOW_RUN_STATUSES, default: 'RUNNING' },
    currentNodeId: { type: String, default: null },
    context: { type: Schema.Types.Mixed, default: {} },
    error: { type: String, default: null },
    startedAt: { type: Date, default: () => new Date() },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'workflow_runs' },
);
workflowRunSchema.index({ applicationId: 1 });
workflowRunSchema.index({ workflowId: 1, status: 1 });

export type WorkflowRunDoc = InferSchemaType<typeof workflowRunSchema>;
export const WorkflowRunModel =
  (models.WorkflowRun as Model<WorkflowRunDoc>) || model<WorkflowRunDoc>('WorkflowRun', workflowRunSchema);

const workflowStepSchema = new Schema(
  {
    workflowRunId: { type: Schema.Types.ObjectId, ref: 'WorkflowRun', required: true },
    nodeId: { type: String, required: true },
    nodeType: { type: String, enum: WORKFLOW_NODE_TYPES },
    status: { type: String, enum: WORKFLOW_STEP_STATUSES, default: 'COMPLETED' },
    input: { type: Schema.Types.Mixed, default: null },
    output: { type: Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    startedAt: { type: Date, default: () => new Date() },
    completedAt: { type: Date, default: null },
  },
  { collection: 'workflow_steps' },
);
workflowStepSchema.index({ workflowRunId: 1 });

export type WorkflowStepDoc = InferSchemaType<typeof workflowStepSchema>;
export const WorkflowStepModel =
  (models.WorkflowStep as Model<WorkflowStepDoc>) || model<WorkflowStepDoc>('WorkflowStep', workflowStepSchema);
