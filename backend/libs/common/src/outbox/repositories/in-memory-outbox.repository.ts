import { Injectable } from '@nestjs/common';
import { OutboxEvent } from '../outbox-event.entity';
import { OutboxRepository } from '../outbox.repository';

@Injectable()
export class InMemoryOutboxRepository extends OutboxRepository {
  // Indexes
  private byId: Map<string, OutboxEvent> = new Map();
  private unprocessedByCreatedAt: string[] = [];

  async save(event: OutboxEvent): Promise<void> {
    const existing = this.byId.get(event.id);
    const entity = new OutboxEvent(event.toValue());
    this.byId.set(entity.id, entity);

    const wasUnprocessed = existing ? !existing.isProcessed() : false;
    const isUnprocessed = !entity.isProcessed();

    // Maintain unprocessed sorted index
    if (isUnprocessed && !wasUnprocessed && !this.unprocessedByCreatedAt.includes(entity.id)) {
      this.insertIntoUnprocessed(entity);
    } else if (isUnprocessed && wasUnprocessed) {
      // If createdAt changed, re-position
      this.removeFromUnprocessed(entity.id);
      this.insertIntoUnprocessed(entity);
    } else if (!isUnprocessed && wasUnprocessed) {
      this.removeFromUnprocessed(entity.id);
    }
  }

  async findUnprocessed(limit = 10): Promise<OutboxEvent[]> {
    const ids = this.unprocessedByCreatedAt.slice(0, limit);
    return ids.map((id) => this.byId.get(id)!).filter(Boolean);
  }

  async deleteProcessed(before: Date): Promise<void> {
    for (const [id, e] of this.byId.entries()) {
      if (e.isProcessedBefore(before)) {
        this.byId.delete(id);
        this.removeFromUnprocessed(id);
      }
    }
  }

  private insertIntoUnprocessed(event: OutboxEvent): void {
    // Binary insert by createdAt asc
    let lo = 0;
    let hi = this.unprocessedByCreatedAt.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const midEvent = this.byId.get(this.unprocessedByCreatedAt[mid])!;
      if (midEvent.createdAt.getTime() <= event.createdAt.getTime()) lo = mid + 1;
      else hi = mid;
    }
    this.unprocessedByCreatedAt.splice(lo, 0, event.id);
  }

  private removeFromUnprocessed(id: string): void {
    const idx = this.unprocessedByCreatedAt.indexOf(id);
    if (idx >= 0) this.unprocessedByCreatedAt.splice(idx, 1);
  }
}
