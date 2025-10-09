import type { Repository } from '../../general';
import type { OutboxEvent } from './outbox.aggregate';
import type { Id } from '../../general';
import type { RepositoryContext } from '../../transactions';

export interface Outbox_Repository extends Repository<OutboxEvent, Id> {
  save(event: OutboxEvent, context?: RepositoryContext): Promise<void>;
  findUnprocessed(limit?: number): Promise<OutboxEvent[]>;
  deleteProcessed(olderThan: Date): Promise<void>;
}
