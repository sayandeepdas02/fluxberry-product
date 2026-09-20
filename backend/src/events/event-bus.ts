import type { EventType } from '../shared';
import { EventModel } from '../models/event.model';
import { logger } from '../utils/logger';
import type { DomainEventInput, EventHandler, PersistedEvent } from './event-types';

/**
 * Lightweight domain event bus (spec: SIMPLE EVENT BUS — no Kafka).
 * `publish` persists the event (timeline + analytics source of truth) and then
 * notifies in-process subscribers best-effort. Critical async pipeline steps are
 * enqueued explicitly via the JobQueue by services, so a dropped subscriber can
 * never corrupt core state.
 */
export interface EventBus {
  publish(event: DomainEventInput): Promise<PersistedEvent>;
  subscribe(type: EventType | '*', handler: EventHandler): void;
}

class MongoEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>();

  subscribe(type: EventType | '*', handler: EventHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  async publish(input: DomainEventInput): Promise<PersistedEvent> {
    const doc = await EventModel.create({
      workspaceId: input.workspaceId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      applicationId: input.applicationId ?? null,
      candidateId: input.candidateId ?? null,
      actorId: input.actorId ?? null,
      actorLabel: input.actorLabel ?? 'system',
      payload: input.payload ?? {},
    });

    const persisted: PersistedEvent = {
      ...input,
      id: doc.id,
      createdAt: doc.createdAt as Date,
    };

    const subscribers = [
      ...(this.handlers.get(input.type) ?? []),
      ...(this.handlers.get('*') ?? []),
    ];
    for (const handler of subscribers) {
      try {
        await handler(persisted);
      } catch (err) {
        logger.error({ err, type: input.type }, 'event subscriber failed');
      }
    }

    return persisted;
  }
}

export const eventBus: EventBus = new MongoEventBus();
