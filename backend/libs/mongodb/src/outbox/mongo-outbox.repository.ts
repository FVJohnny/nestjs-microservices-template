import { Injectable, Inject } from '@nestjs/common';
import type { MongoClient, Filter } from 'mongodb';

import {
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
  extends BaseMongoRepository<OutboxEvent, OutboxEventDTO>
  implements OutboxRepository
{
  constructor(@Inject(MONGO_CLIENT_TOKEN) mongoClient: MongoClient) {
    super(mongoClient, 'outbox_events');
  }

  protected toEntity(dto: OutboxEventDTO): OutboxEvent {
    return OutboxEvent.fromValue(dto);
  }

  async findUnprocessed(limit = 100) {
    await this.ensureIndexes();
    // Safe type assertion - we know OutboxEventDTO has processedAt field
    const filter: Filter<OutboxEventDTO> = {
      processedAt: OutboxProcessedAt.never().toValue(),
    } as Filter<OutboxEventDTO>;

    const cursor = this.collection.find(filter).sort({ createdAt: 1 }).limit(limit);

    const docs = await cursor.toArray();
    return docs.map((d) => OutboxEvent.fromValue(d as OutboxEventDTO));
  }

  async deleteProcessed(before: Date, context?: RepositoryContext) {
    await this.ensureIndexes();
    this.registerTransactionParticipant(context);

    // Safe type assertion - we know OutboxEventDTO structure and MongoDB query operators
    const filter: Filter<OutboxEventDTO> = {
      processedAt: {
        $lt: before,
        $ne: OutboxProcessedAt.never().toValue(),
      },
    } as Filter<OutboxEventDTO>;

    await this.collection.deleteMany(filter, {
      session: this.getTransactionSession(context),
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
