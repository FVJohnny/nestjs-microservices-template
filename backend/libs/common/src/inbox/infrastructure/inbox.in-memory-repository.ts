import { Base_InMemoryRepository } from '../../general/infrastructure';
import type { InboxRepository } from '../domain/inbox.repository';
import type { InboxEventDTO } from '../domain/inbox.entity';
import { InboxEvent } from '../domain/inbox.entity';
import type { RepositoryContext } from '../../transactions';
import type { InboxStatusVO } from '../domain/value-objects';
import type { DateVO } from '../../general';

export class Inbox_InMemory_Repository
  extends Base_InMemoryRepository<InboxEvent, InboxEventDTO>
  implements InboxRepository
{
  protected toEntity(dto: InboxEventDTO): InboxEvent {
    return InboxEvent.fromValue(dto);
  }

  async findPendingEvents(limit = 100): Promise<InboxEvent[]> {
    const entities = await this.findAll();
    return entities
      .filter((event) => event.isPending())
      .sort((a, b) => (a.receivedAt.isBefore(b.receivedAt) ? -1 : 1))
      .slice(0, limit);
  }

  async findByStatus(status: InboxStatusVO, limit = 100): Promise<InboxEvent[]> {
    const entities = await this.findAll();
    return entities
      .filter((event) => event.status.toValue() === status.toValue())
      .sort((a, b) => (a.receivedAt.isBefore(b.receivedAt) ? -1 : 1))
      .slice(0, limit);
  }

  async deleteProcessed(olderThan: DateVO, context?: RepositoryContext): Promise<void> {
    const entities = await this.findAll();
    const toDelete = entities.filter(
      (event) => event.isProcessed() && event.processedAt.isBefore(olderThan),
    );

    for (const event of toDelete) {
      await this.remove(event.id, context);
    }
  }
}
