import { Injectable } from '@nestjs/common';
import { OutboxEvent } from '../outbox-event.entity';
import { OutboxRepository } from '../outbox.repository';

@Injectable()
export class InMemoryOutboxRepository extends OutboxRepository {
  private events: Map<string, OutboxEvent> = new Map();

  async save(event: OutboxEvent): Promise<void> {
    const entity = new OutboxEvent(event.toValue());
    this.events.set(entity.id, entity);
  }

  async findUnprocessed(limit = 10): Promise<OutboxEvent[]> {
    return Array.from(this.events.values())
      .filter((e) => !e.isProcessed())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }

  async deleteProcessed(before: Date): Promise<void> {
    this.events = new Map(
      Array.from(this.events.entries()).filter(([_, e]) => !e.isProcessedBefore(before)),
    );
  }
}
