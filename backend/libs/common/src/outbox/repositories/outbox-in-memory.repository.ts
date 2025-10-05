import { Injectable } from '@nestjs/common';
import { OutboxEvent, OutboxEventDTO } from '../domain/outbox-event.entity';
import { OutboxRepository } from '../domain/outbox.repository';
import { InMemoryBaseRepository } from '../../general/infrastructure/in-memory-base.repository';

@Injectable()
export class Outbox_InMemory_Repository
  extends InMemoryBaseRepository<OutboxEvent, OutboxEventDTO>
  implements OutboxRepository
{
  constructor(shouldThrowError = false) {
    super(shouldThrowError);
  }

  protected toEntity(dto: OutboxEventDTO): OutboxEvent {
    return OutboxEvent.fromValue(dto);
  }

  protected toValue(entity: OutboxEvent): OutboxEventDTO {
    return entity.toValue();
  }

  async findUnprocessed(limit = 10) {
    this.validate('findUnprocessed');
    return (await this.findAll())
      .filter((e) => e.processedAt.isNeverProcessed())
      .sort((a, b) => a.timestamps.createdAt.getTime() - b.timestamps.createdAt.getTime())
      .slice(0, limit);
  }

  async deleteProcessed(before: Date) {
    this.validate('deleteProcessed');
    const allItems = await this.findAll();
    for (const event of allItems) {
      if (event.isProcessedBefore(before)) {
        await this.remove(event.id);
      }
    }
  }
}
