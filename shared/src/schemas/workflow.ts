import { z } from 'zod';
import {
  WORKFLOW_NODE_TYPES,
  WORKFLOW_STATUSES,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_STEP_STATUSES,
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
} from '../enums';
import type {
  WorkflowNodeType,
  WorkflowStatus,
  WorkflowRunStatus,
  WorkflowStepStatus,
} from '../enums';

export const positionSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
});

/** A safe, structured condition — never raw user code (spec §97). */
export const conditionSchema = z.object({
  field: z.enum(CONDITION_FIELDS),
  op: z.enum(CONDITION_OPERATORS),
  value: z.union([z.string(), z.number()]),
});
export type Condition = z.infer<typeof conditionSchema>;

// Per-node-type config schemas
const emptyConfig = z.object({}).default({});
const conditionConfig = z.object({ condition: conditionSchema });
const sendAssessmentConfig = z.object({ assessmentId: z.string().min(1) });
const waitConfig = z.object({ durationHours: z.number().min(0).max(24 * 90) });
/** A job's stage id — one of its custom stages, or a system default if it hasn't customized. */
const moveStageConfig = z.object({ stage: z.string().trim().min(1).max(40) });
const sendEmailConfig = z.object({
  template: z.string().default('custom'),
  subject: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});

function nodeOf<T extends WorkflowNodeType, C extends z.ZodTypeAny>(
  type: T,
  config: C,
) {
  return z.object({
    id: z.string().min(1),
    type: z.literal(type),
    position: positionSchema.default({ x: 0, y: 0 }),
    config,
  });
}

export const workflowNodeSchema = z.discriminatedUnion('type', [
  nodeOf('APPLICATION_RECEIVED', emptyConfig),
  nodeOf('AI_SCREEN', emptyConfig),
  nodeOf('CONDITION', conditionConfig),
  nodeOf('SEND_ASSESSMENT', sendAssessmentConfig),
  nodeOf('WAIT', waitConfig),
  nodeOf('MOVE_STAGE', moveStageConfig),
  nodeOf('SEND_EMAIL', sendEmailConfig),
  nodeOf('CODING_ASSESSMENT', sendAssessmentConfig),
  nodeOf('AI_INTERVIEW', emptyConfig),
]);
export type WorkflowNodeInput = z.infer<typeof workflowNodeSchema>;

export const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  /** For CONDITION nodes, which branch this edge represents. */
  branch: z.enum(['yes', 'no']).nullish(),
});
export type WorkflowEdgeInput = z.infer<typeof workflowEdgeSchema>;

export const upsertWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  status: z.enum(WORKFLOW_STATUSES).optional(),
  nodes: z.array(workflowNodeSchema).max(50),
  edges: z.array(workflowEdgeSchema).max(100),
});
export type UpsertWorkflowInput = z.infer<typeof upsertWorkflowSchema>;

export type WorkflowNodeDto = {
  id: string;
  type: WorkflowNodeType;
  config: Record<string, unknown>;
  position: { x: number; y: number };
};

export type WorkflowEdgeDto = {
  id: string;
  source: string;
  target: string;
  branch?: 'yes' | 'no' | null;
};

export type WorkflowDto = {
  id: string;
  workspaceId: string;
  jobId: string;
  name: string;
  status: WorkflowStatus;
  nodes: WorkflowNodeDto[];
  edges: WorkflowEdgeDto[];
  createdAt: string;
  updatedAt: string;
};

export type WorkflowStepDto = {
  id: string;
  nodeId: string;
  nodeType?: WorkflowNodeType;
  status: WorkflowStepStatus;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type WorkflowRunDto = {
  id: string;
  workflowId: string;
  applicationId: string;
  status: WorkflowRunStatus;
  currentNodeId?: string | null;
  context?: Record<string, unknown>;
  steps: WorkflowStepDto[];
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export {
  WORKFLOW_NODE_TYPES,
  WORKFLOW_STATUSES,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_STEP_STATUSES,
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
};
