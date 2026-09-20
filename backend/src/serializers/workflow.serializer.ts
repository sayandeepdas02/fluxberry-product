import type { WorkflowDto, WorkflowRunDto, WorkflowStepDto } from '../shared';

export function toWorkflowDto(w: any): WorkflowDto {
  return {
    id: String(w._id),
    workspaceId: String(w.workspaceId),
    jobId: String(w.jobId),
    name: w.name,
    status: w.status,
    nodes: (w.nodes ?? []).map((n: any) => ({
      id: n.id,
      type: n.type,
      config: n.config ?? {},
      position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
    })),
    edges: (w.edges ?? []).map((e: any) => ({ id: e.id, source: e.source, target: e.target, branch: e.branch ?? null })),
    createdAt: new Date(w.createdAt).toISOString(),
    updatedAt: new Date(w.updatedAt).toISOString(),
  };
}

export function toWorkflowStepDto(s: any): WorkflowStepDto {
  return {
    id: String(s._id),
    nodeId: s.nodeId,
    nodeType: s.nodeType,
    status: s.status,
    input: s.input ?? null,
    output: s.output ?? null,
    error: s.error ?? null,
    startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
    completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : null,
  };
}

export function toWorkflowRunDto(r: any, steps: any[]): WorkflowRunDto {
  return {
    id: String(r._id),
    workflowId: String(r.workflowId),
    applicationId: String(r.applicationId),
    status: r.status,
    currentNodeId: r.currentNodeId ?? null,
    context: r.context ?? {},
    steps: steps.map(toWorkflowStepDto),
    startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : null,
    completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}
