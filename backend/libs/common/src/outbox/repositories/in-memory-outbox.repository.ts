import { Injectable } from '@nestjs/common';
import { OutboxEvent, OutboxEventValue } from '../outbox-event.entity';
import { OutboxRepository } from '../outbox.repository';
import { Id } from 'src/general';

@Injectable()
export class InMemoryOutboxRepository implements OutboxRepository {
  // Indexes
  private byId: Map<string, OutboxEventValue> = new Map();

  async save(event: OutboxEvent): Promise<void> {
    this.byId.set(event.id.toValue(), event.toValue());
  }

  async findUnprocessed(limit = 10): Promise<OutboxEvent[]> {
    const result = Array.from(this.byId.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .filter((e) => new Date(e.processedAt).getTime() === OutboxEvent.NEVER_PROCESSED.getTime())
      .slice(0, limit)
      .map((e) => OutboxEvent.fromValue(e));

    return result;
  }

  async deleteProcessed(before: Date): Promise<void> {
    for (const [id, e] of this.byId.entries()) {
      const event = OutboxEvent.fromValue(e);
      if (event.isProcessedBefore(before)) {
        this.byId.delete(id);
      }
    }
  }

  async findById(id: Id): Promise<OutboxEvent | null> {
    const dto = this.byId.get(id.toValue());
    return dto ? OutboxEvent.fromValue(dto) : null;
  }

  async exists(id: Id): Promise<boolean> {
    return this.byId.has(id.toValue());
  }

  async remove(id: Id): Promise<void> {
    this.byId.delete(id.toValue());
  }

  async clear(): Promise<void> {
    this.byId.clear();
  }
}
