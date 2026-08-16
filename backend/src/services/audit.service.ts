import { AuditLogModel } from '../models/audit-log.model';
import { logger } from '../utils/logger';

export interface AuditEntry {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export const auditService = {
  /** Fire-and-forget audit logging; never blocks or breaks the main operation. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await AuditLogModel.create({
        workspaceId: entry.workspaceId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        metadata: entry.metadata ?? {},
      });
    } catch (err) {
      logger.error({ err, action: entry.action }, 'audit log failed');
    }
  },
};
