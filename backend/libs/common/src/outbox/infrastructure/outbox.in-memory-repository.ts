import { Injectable } from '@nestjs/common';
import { OutboxEvent, OutboxEventDTO } from '../domain/outbox.aggregate';
import { Outbox_Repository } from '../domain/outbox.repository';
import { Base_InMemoryRepository } from '../../general/infrastructure/base.in-memory-repository';

@Injectable()
export class Outbox_InMemoryRepository
  extends Base_InMemoryRepository<OutboxEvent, OutboxEventDTO>
  implements Outbox_Repository
{
  constructor(shouldThrowError = false) {
    super(shouldThrowError);
  }

  protected toEntity(dto: OutboxEventDTO): OutboxEvent {
    return OutboxEvent.fromValue(dto);
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
