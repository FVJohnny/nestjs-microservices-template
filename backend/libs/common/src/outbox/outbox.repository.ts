import type { OutboxEvent } from './outbox-event.entity';

export abstract class OutboxRepository {
  abstract save(event: OutboxEvent): Promise<void>;
  abstract findUnprocessed(limit?: number): Promise<OutboxEvent[]>;
  abstract deleteProcessed(olderThan: Date): Promise<void>;
}
