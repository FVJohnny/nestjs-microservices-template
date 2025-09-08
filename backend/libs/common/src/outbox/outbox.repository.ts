import type { OutboxEvent } from './outbox-event.entity';

export abstract class OutboxRepository {
  abstract save(event: OutboxEvent): Promise<void>;
  abstract findUnprocessed(limit?: number): Promise<OutboxEvent[]>;
  abstract markAsProcessed(eventId: string): Promise<void>;
  abstract incrementRetryCount(eventId: string): Promise<void>;
  abstract deleteProcessed(olderThan: Date): Promise<void>;
}
