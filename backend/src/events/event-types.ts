import type { Types } from 'mongoose';
import type { EventType } from '../shared';

export type IdLike = string | Types.ObjectId;

export interface DomainEventInput {
  workspaceId: IdLike;
  type: EventType;
  entityType: string;
  entityId?: IdLike;
  applicationId?: IdLike | null;
  candidateId?: IdLike | null;
  actorId?: IdLike | null;
  /** Human-friendly actor label for the timeline ("system", "candidate", or a name). */
  actorLabel?: string;
  payload?: Record<string, unknown>;
}

export interface PersistedEvent extends DomainEventInput {
  id: string;
  createdAt: Date;
}

export type EventHandler = (event: PersistedEvent) => void | Promise<void>;
