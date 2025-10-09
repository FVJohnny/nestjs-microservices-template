import { Injectable } from '@nestjs/common';
import { OutboxEvent, OutboxEventDTO } from '../domain/outbox.entity';
import { Outbox_Repository } from '../domain/outbox.repository';
import { Base_InMemory_Repository } from '../../general/infrastructure/base.in-memory-repository';

@Injectable()
export class Outbox_InMemory_Repository
  extends Base_InMemory_Repository<OutboxEvent, OutboxEventDTO>
  implements Outbox_Repository
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
