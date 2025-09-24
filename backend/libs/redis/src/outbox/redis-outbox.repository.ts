import { Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import {
  Id,
  OutboxEvent,
  OutboxRepository,
  type OutboxEventDTO,
  type RepositoryContext,
} from '@libs/nestjs-common';

import { BaseRedisRepository } from '../base-redis.repository';

@Injectable()
export class RedisOutboxRepository extends BaseRedisRepository implements OutboxRepository {
  private readonly keyPrefix = 'outbox:';
  private readonly itemKey = (id: string) => `${this.keyPrefix}event:${id}`;
  private readonly zUnprocessed = `${this.keyPrefix}unprocessedByCreatedAt`;
  private readonly zProcessed = `${this.keyPrefix}processedByProcessedAt`;

  constructor(redisClient: Redis) {
    super(redisClient);
  }

  async save(event: OutboxEvent, context?: RepositoryContext) {
    const client = this.getClient(context);
    if (!client) {
      this.logger.warn('Redis client not available. Skipping save().');
      return;
    }

    const v = event.toValue();
    const key = this.itemKey(v.id);

    // Store the full value as JSON to avoid field-by-field mapping
    await client.set(key, JSON.stringify(v));

    // Maintain secondary indexes
    if (event.isUnprocessed()) {
      await client.zadd(this.zUnprocessed, Date.parse(String(v.createdAt)), v.id);
      await client.zrem(this.zProcessed, v.id);
    } else {
      await client.zrem(this.zUnprocessed, v.id);
      await client.zadd(this.zProcessed, Date.parse(String(v.processedAt)), v.id);
    }
  }

  async findById(id: Id) {
    const client = this.getRedisClient();

    const key = this.itemKey(id.toValue());
    const json = await client.get(key);
    if (!json) return null;
    try {
      const parsed = JSON.parse(json) as unknown as OutboxEventDTO;
      return OutboxEvent.fromValue(parsed);
    } catch {
      this.logger.warn('Failed to parse JSON for key: ' + key);
      return null;
    }
  }

  async exists(id: Id) {
    const client = this.getRedisClient();
    const key = this.itemKey(id.toValue());

    const exists = await client.exists(key);
    return exists === 1;
  }

  async remove(id: Id, context?: RepositoryContext) {
    const client = this.getClient(context);

    const key = this.itemKey(id.toValue());
    await client.del(key);
  }

  async clear(context?: RepositoryContext) {
    const client = this.getClient(context);

    await client.del(this.zUnprocessed, this.zProcessed);
  }

  async findUnprocessed(limit = 100) {
    const client = this.getRedisClient();

    const ids = await client.zrange(this.zUnprocessed, 0, 100);
    if (ids.length === 0) return [];

    const keys = ids.map((id) => this.itemKey(id));
    const jsons = await client.mget(keys);

    return jsons
      .map((json) => {
        try {
          const parsed = JSON.parse(json ?? '') as unknown as OutboxEventDTO;
          return parsed;
        } catch {
          this.logger.warn(`Failed to parse JSON: ${json}`);
          return null;
        }
      })
      .filter((v) => v !== null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, limit)
      .map((v) => OutboxEvent.fromValue(v));
  }

  async deleteProcessed(olderThan: Date, context?: RepositoryContext) {
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
}
