import { Injectable } from '@nestjs/common';
import { OutboxEvent, OutboxEventValue } from '../outbox-event.entity';
import { OutboxRepository } from '../outbox.repository';
import { Id } from '../../general';
import { InfrastructureException } from '../../errors';

@Injectable()
export class InMemoryOutboxRepository implements OutboxRepository {
  // Indexes
  private byId: Map<string, OutboxEventValue> = new Map();

  constructor(private shouldThrowError = false) {
    this.byId = new Map();
  }

  async save(event: OutboxEvent) {
    this.validate('save');
    this.byId.set(event.id.toValue(), event.toValue());
  }

  async findAll() {
    this.validate('findAll');
    return Array.from(this.byId.values()).map((e) => OutboxEvent.fromValue(e));
  }

  async findUnprocessed(limit = 10) {
    this.validate('findUnprocessed');
    const result = Array.from(this.byId.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .filter((e) => new Date(e.processedAt).getTime() === OutboxEvent.NEVER_PROCESSED.getTime())
      .slice(0, limit)
      .map((e) => OutboxEvent.fromValue(e));

    return result;
  }

  async deleteProcessed(before: Date) {
    this.validate('deleteProcessed');
    for (const [id, e] of this.byId.entries()) {
      const event = OutboxEvent.fromValue(e);
      if (event.isProcessedBefore(before)) {
        this.byId.delete(id);
      }
    }
  }

  async findById(id: Id) {
    this.validate('findById');
    const dto = this.byId.get(id.toValue());
    return dto ? OutboxEvent.fromValue(dto) : null;
  }

  async exists(id: Id) {
    this.validate('exists');
    return this.byId.has(id.toValue());
  }

  async remove(id: Id) {
    this.validate('remove');
    this.byId.delete(id.toValue());
  }

  async clear() {
    this.validate('clear');
    this.byId.clear();
  }

  validate(operation: string): void {
    if (this.shouldThrowError) {
      throw new InfrastructureException(
        operation,
        `Failed to ${operation} OutboxEvent`,
        new Error(`Failed to ${operation} OutboxEvent`),
      );
    }
  }
}
