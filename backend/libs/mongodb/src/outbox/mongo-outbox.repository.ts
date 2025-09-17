import { Injectable, Inject } from '@nestjs/common';
import type { MongoClient } from 'mongodb';

import { Id, OutboxEvent, OutboxRepository, type OutboxEventValue } from '@libs/nestjs-common';
import { MONGO_CLIENT_TOKEN } from '../mongodb.module';
import { BaseMongoRepository, IndexSpec } from '../base-mongo.repository';

@Injectable()
export class MongoOutboxRepository
  extends BaseMongoRepository<OutboxEventValue>
  implements OutboxRepository
{
  constructor(@Inject(MONGO_CLIENT_TOKEN) mongoClient: MongoClient) {
    super(mongoClient, 'outbox_events');
  }

  async save(event: OutboxEvent) {
    await this.collection.updateOne(
      { id: event.id.toValue() },
      { $set: event.toValue() },
      { upsert: true },
    );
  }

  async findById(id: Id) {
    const dto = await this.collection.findOne({ id: id.toValue() });
    return dto ? OutboxEvent.fromValue(dto) : null;
  }

  async exists(id: Id) {
    const dto = await this.collection.findOne({ id: id.toValue() });
    return !!dto;
  }

  async remove(id: Id) {
    await this.collection.deleteOne({ id: id.toValue() });
  }

  async clear() {
    await this.collection.deleteMany({});
  }

  async findUnprocessed(limit = 100) {
    const cursor = this.collection
      .find({ processedAt: OutboxEvent.NEVER_PROCESSED })
      .sort({ createdAt: 1 })
      .limit(limit);

    const docs = await cursor.toArray();
    return docs.map((d) => OutboxEvent.fromValue(d));
  }

  async deleteProcessed(before: Date) {
    await this.collection.deleteMany({
      processedAt: {
        $lt: before,
        $ne: OutboxEvent.NEVER_PROCESSED,
      },
    });
  }

  protected defineIndexes(): IndexSpec[] {
    return [
      {
        fields: { id: 1 },
        options: {
          unique: true,
          name: 'ux_outbox_id',
        },
      },
      {
        fields: { processedAt: 1 },
        options: { name: 'idx_outbox_processedAt' },
      },
      {
        fields: { createdAt: 1 },
        options: { name: 'idx_outbox_createdAt' },
      },
    ];
  }
}
