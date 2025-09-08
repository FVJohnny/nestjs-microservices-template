import { Injectable } from "@nestjs/common";
import { OutboxEvent } from "../outbox-event.entity";
import { OutboxRepository } from "../outbox.repository";

@Injectable()
export class InMemoryOutboxRepository extends OutboxRepository {
  private events: OutboxEvent[] = [];

  async save(event: OutboxEvent): Promise<void> {
    const entity = new OutboxEvent(
      event.id,
      event.eventName,
      event.topic,
      event.payload,
      event.createdAt,
      event.processedAt,
      event.retryCount,
      event.maxRetries,
    );
    this.events.push(entity);
  }

  async findUnprocessed(limit = 10): Promise<OutboxEvent[]> {
    return this.events
      .filter((e) => !e.isProcessed())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }

  async markAsProcessed(eventId: string): Promise<void> {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      event.markAsProcessed();
    }
  }

  async incrementRetryCount(eventId: string): Promise<void> {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      event.incrementRetry();
    }
  }

  async deleteProcessed(olderThan: Date): Promise<void> {
    this.events = this.events.filter(
      (e) => !e.isProcessed() || e.processedAt! > olderThan,
    );
  }
}
