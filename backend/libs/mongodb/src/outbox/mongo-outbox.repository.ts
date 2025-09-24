import { Injectable, Inject } from '@nestjs/common';
import type { MongoClient } from 'mongodb';

import {
  Id,
  OutboxEvent,
  OutboxProcessedAt,
  OutboxRepository,
  type OutboxEventDTO,
  type RepositoryContext,
} from '@libs/nestjs-common';
import { MONGO_CLIENT_TOKEN } from '../mongodb.tokens';
import { BaseMongoRepository, IndexSpec } from '../base-mongo.repository';

@Injectable()
export class MongoOutboxRepository
  extends BaseMongoRepository<OutboxEventDTO>
  implements OutboxRepository
{
  constructor(@Inject(MONGO_CLIENT_TOKEN) mongoClient: MongoClient) {
    super(mongoClient, 'outbox_events');
  }

  async findById(id: Id) {
    const dto = await this.collection.findOne({ id: id.toValue() });
    return dto ? OutboxEvent.fromValue(dto) : null;
  }

  async findUnprocessed(limit = 100) {
    const cursor = this.collection
      .find({ processedAt: OutboxProcessedAt.never().toValue() })
      .sort({ createdAt: 1 })
      .limit(limit);

    const docs = await cursor.toArray();
    return docs.map((d) => OutboxEvent.fromValue(d));
  }

  async exists(id: Id) {
    const dto = await this.collection.findOne({ id: id.toValue() });
    return !!dto;
  }

  async save(event: OutboxEvent, context?: RepositoryContext) {
    this.registerTransactionParticipant(context);
    await this.collection.updateOne(
      { id: event.id.toValue() },
      { $set: event.toValue() },
      { upsert: true, session: this.getTransactionSession(context) },
    );
  }

  async remove(id: Id, context?: RepositoryContext) {
    this.registerTransactionParticipant(context);
    await this.collection.deleteOne(
      { id: id.toValue() },
      { session: this.getTransactionSession(context) },
    );
  }

  async clear(context?: RepositoryContext) {
    this.registerTransactionParticipant(context);
    await this.collection.deleteMany({}, { session: this.getTransactionSession(context) });
  }

  async deleteProcessed(before: Date, context?: RepositoryContext) {
    this.registerTransactionParticipant(context);
    await this.collection.deleteMany(
      {
        processedAt: {
          $lt: before,
          $ne: OutboxProcessedAt.never().toValue(),
        },
      },
      { session: this.getTransactionSession(context) },
    );
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
