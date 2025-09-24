import type { Repository } from '../../general';
import type { OutboxEvent } from './outbox-event.entity';
import type { Id } from '../../general';
import type { RepositoryContext } from '../../transactions';

export interface OutboxRepository extends Repository<OutboxEvent, Id> {
  save(event: OutboxEvent, context?: RepositoryContext): Promise<void>;
  findUnprocessed(limit?: number): Promise<OutboxEvent[]>;
  deleteProcessed(olderThan: Date): Promise<void>;
}
