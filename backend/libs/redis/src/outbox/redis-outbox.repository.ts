import { Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import {
  CorrelationLogger,
  Id,
  OutboxEvent,
  OutboxRepository,
  type OutboxEventDTO,
} from '@libs/nestjs-common';

@Injectable()
export class RedisOutboxRepository implements OutboxRepository {
  private readonly logger = new CorrelationLogger(RedisOutboxRepository.name);
  private readonly keyPrefix = 'outbox:';
  private readonly itemKey = (id: string) => `${this.keyPrefix}event:${id}`;
  private readonly zUnprocessed = `${this.keyPrefix}unprocessedByCreatedAt`;
  private readonly zProcessed = `${this.keyPrefix}processedByProcessedAt`;

  constructor(private readonly redisClient: Redis) {}

  async save(event: OutboxEvent) {
    if (!this.redisClient) {
      this.logger.warn('Redis client not available. Skipping save().');
      return;
    }

    const v = event.toValue();
    const key = this.itemKey(v.id);

    // Store the full value as JSON to avoid field-by-field mapping
    await this.redisClient.set(key, JSON.stringify(v));

    // Maintain secondary indexes
    const isUnprocessed = v.processedAt.getTime() === OutboxEvent.NEVER_PROCESSED.getTime();
    if (isUnprocessed) {
      await this.redisClient.zadd(this.zUnprocessed, Date.parse(String(v.createdAt)), v.id);
      await this.redisClient.zrem(this.zProcessed, v.id);
    } else {
      await this.redisClient.zrem(this.zUnprocessed, v.id);
      await this.redisClient.zadd(this.zProcessed, Date.parse(String(v.processedAt)), v.id);
    }
  }

  async findById(id: Id) {
    if (!this.redisClient) {
      this.logger.warn('Redis client not available. Returning null.');
      return null;
    }

    const key = this.itemKey(id.toValue());
    const json = await this.redisClient.get(key);
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
    if (!this.redisClient) {
      this.logger.warn('Redis client not available. Returning false.');
      return false;
    }

    const key = this.itemKey(id.toValue());
    const exists = await this.redisClient.exists(key);
    return exists === 1;
  }

  async remove(id: Id) {
    if (!this.redisClient) {
      this.logger.warn('Redis client not available. Skipping remove().');
      return;
    }

    const key = this.itemKey(id.toValue());
    await this.redisClient.del(key);
  }

  async clear() {
    if (!this.redisClient) {
      this.logger.warn('Redis client not available. Skipping clear().');
      return;
    }

    await this.redisClient.del(this.zUnprocessed, this.zProcessed);
  }

  async findUnprocessed(limit = 100) {
    if (!this.redisClient) {
      this.logger.warn('Redis client not available. Returning empty list.');
      return [];
    }

    const ids = await this.redisClient.zrange(this.zUnprocessed, 0, 100);
    if (ids.length === 0) return [];

    const keys = ids.map((id) => this.itemKey(id));
    const jsons = await this.redisClient.mget(keys);

    const values: OutboxEventDTO[] = [];
    for (const json of jsons) {
      if (!json) continue;
      try {
        const parsed = JSON.parse(json) as unknown as OutboxEventDTO;
        values.push(parsed);
      } catch {
        this.logger.warn(`Failed to parse JSON: ${json}`);
      }
    }

    // Map to entities and ensure order by createdAt asc
    return values
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, limit)
      .map((v) => OutboxEvent.fromValue(v));
  }

  async deleteProcessed(olderThan: Date) {
    if (!this.redisClient) {
      this.logger.warn('Redis client not available. Skipping deleteProcessed().');
      return;
    }

    const cutoff = olderThan.getTime();
    const ids = await this.redisClient.zrangebyscore(this.zProcessed, '-inf', cutoff);
    if (ids.length === 0) return;

    const pipeline = this.redisClient.pipeline();
    ids.forEach((id) => {
      pipeline.del(this.itemKey(id));
      pipeline.zrem(this.zProcessed, id);
      pipeline.zrem(this.zUnprocessed, id);
    });
    await pipeline.exec();
  }
}
