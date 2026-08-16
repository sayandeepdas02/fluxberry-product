import { workflowEngine } from '../../services/workflow-engine.service';
import type { JobHandler } from './index';

export const runWorkflowHandler: JobHandler = async (payload) => {
  await workflowEngine.execute(payload.runId);
};
