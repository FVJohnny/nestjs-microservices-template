import { Injectable, Inject } from '@nestjs/common';
import type { Collection, MongoClient } from 'mongodb';

import { OutboxEvent, OutboxRepository, type OutboxEventValue } from '@libs/nestjs-common';
import { MONGO_CLIENT_TOKEN } from '../mongodb.module';
import { MongoDBConfigService } from '../mongodb-config.service';

@Injectable()
export class MongoOutboxRepository extends OutboxRepository {
  private readonly collectionName = 'outbox_events';

  constructor(
    @Inject(MONGO_CLIENT_TOKEN) private readonly client: MongoClient,
    private readonly config: MongoDBConfigService,
  ) {
    super();
  }

  private getCollection(): Collection<OutboxEventValue> {
    const dbName = this.config.getDatabaseName() || 'default';
    return this.client.db(dbName).collection<OutboxEventValue>(this.collectionName);
  }

  async save(event: OutboxEvent): Promise<void> {
    const col = this.getCollection();
    await col.updateOne({ id: event.id }, { $set: event.toValue() }, { upsert: true });
  }

  async findUnprocessed(limit = 100): Promise<OutboxEvent[]> {
    const col = this.getCollection();
    const cursor = col
      .find({ processedAt: { $exists: false } })
      .sort({ createdAt: 1 })
      .limit(limit);

    const docs = await cursor.toArray();
    return docs.map((d) => OutboxEvent.fromValue(d));
  }

  async deleteProcessed(before: Date): Promise<void> {
    const col = this.getCollection();
    await col.deleteMany({ processedAt: { $lt: before } });
  }
}
