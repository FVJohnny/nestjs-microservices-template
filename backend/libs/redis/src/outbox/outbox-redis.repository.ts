import { Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { OutboxEvent, OutboxRepository, type RepositoryContext } from '@libs/nestjs-common';

import { BaseRedisRepository } from '../base-redis.repository';

@Injectable()
export class Outbox_Redis_Repository
  extends BaseRedisRepository<OutboxEvent>
  implements OutboxRepository
{
  private readonly keyPrefix = 'outbox:';
  private readonly zUnprocessed = `${this.keyPrefix}unprocessedByCreatedAt`;
  private readonly zProcessed = `${this.keyPrefix}processedByProcessedAt`;

  constructor(redisClient: Redis) {
    super(redisClient);
  }

  protected itemKey(id: string): string {
    return `${this.keyPrefix}event:${id}`;
  }

  protected toEntity(json: string): OutboxEvent {
    return OutboxEvent.fromValue(JSON.parse(json));
  }

  async save(event: OutboxEvent, context?: RepositoryContext): Promise<void> {
    await super.save(event, context);

    const client = this.getClient(context);
    const v = event.toValue();

    // Maintain secondary indexes
    if (event.isUnprocessed()) {
      await client.zadd(this.zUnprocessed, Date.parse(String(v.createdAt)), v.id);
      await client.zrem(this.zProcessed, v.id);
    } else {
      await client.zrem(this.zUnprocessed, v.id);
      await client.zadd(this.zProcessed, Date.parse(String(v.processedAt)), v.id);
    }
  }

  async findUnprocessed(limit = 100) {
    const client = this.getRedisClient();

    const ids = await client.zrange(this.zUnprocessed, 0, 100);
    if (ids.length === 0) return [];

    const keys = ids.map((id) => this.itemKey(id));
    const jsons = await client.mget(keys);

    return jsons
      .map((json) => this.toEntity(json ?? ''))
      .filter((v) => v !== null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }

  async deleteProcessed(olderThan: Date, context?: RepositoryContext) {
    this.registerTransactionParticipant(context);
    const client = this.getRedisClient();
    const transactionalClient = this.getTransactionClient(context) ?? client.pipeline();

    const ids = await client.zrangebyscore(this.zProcessed, '-inf', olderThan.getTime());
    if (ids.length === 0) return;

    ids.forEach((id) => {
      transactionalClient.del(this.itemKey(id));
      transactionalClient.zrem(this.zProcessed, id);
      transactionalClient.zrem(this.zUnprocessed, id);
    });

    if (!this.isTransactional(context)) {
      await transactionalClient.exec();
    }
  }

  async clear(context?: RepositoryContext): Promise<void> {
    await super.clear(context);

    const client = this.getClient(context);
    await client.del(this.zUnprocessed, this.zProcessed);
  }
}
