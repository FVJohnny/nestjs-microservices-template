import { Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import {
  CorrelationLogger,
  OutboxEvent,
  OutboxRepository,
  type OutboxEventValue,
} from '@libs/nestjs-common';
import { RedisService } from '../redis.service';

@Injectable()
export class RedisOutboxRepository extends OutboxRepository {
  private readonly logger = new CorrelationLogger(RedisOutboxRepository.name);
  private readonly keyPrefix = 'outbox:';
  private readonly itemKey = (id: string) => `${this.keyPrefix}event:${id}`;
  private readonly zUnprocessed = `${this.keyPrefix}unprocessedByCreatedAt`;
  private readonly zProcessed = `${this.keyPrefix}processedByProcessedAt`;

  constructor(private readonly redisService: RedisService) {
    super();
  }

  private client(): Redis | null {
    return this.redisService.getDatabaseClient();
  }

  async save(event: OutboxEvent): Promise<void> {
    const client = this.client();
    if (!client) {
      this.logger.warn('Redis client not available. Skipping save().');
      return;
    }

    const v = event.toValue();
    const key = this.itemKey(v.id);

    // Store the full value as JSON to avoid field-by-field mapping
    await client.set(key, JSON.stringify(v));

    // Maintain secondary indexes
    const isUnprocessed = v.processedAt.getTime() === OutboxEvent.NEVER_PROCESSED.getTime();
    if (isUnprocessed) {
      await client.zadd(this.zUnprocessed, Date.parse(String(v.createdAt)), v.id);
      await client.zrem(this.zProcessed, v.id);
    } else {
      await client.zrem(this.zUnprocessed, v.id);
      await client.zadd(this.zProcessed, Date.parse(String(v.processedAt)), v.id);
    }
  }

  async findUnprocessed(limit = 100): Promise<OutboxEvent[]> {
    const client = this.client();
    if (!client) {
      this.logger.warn('Redis client not available. Returning empty list.');
      return [];
    }

    const ids = await client.zrange(this.zUnprocessed, 0, Math.max(0, limit - 1));
    if (ids.length === 0) return [];

    const keys = ids.map((id) => this.itemKey(id));
    const jsons = await client.mget(keys);

    const values: OutboxEventValue[] = [];
    for (const json of jsons) {
      if (!json) continue;
      try {
        const parsed = JSON.parse(json) as unknown as OutboxEventValue;
        values.push(parsed);
      } catch {
        // skip malformed entries
      }
    }

    // Map to entities and ensure order by createdAt asc
    return values
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((v) => OutboxEvent.fromValue(v));
  }

  async deleteProcessed(olderThan: Date): Promise<void> {
    const client = this.client();
    if (!client) {
      this.logger.warn('Redis client not available. Skipping deleteProcessed().');
      return;
    }

    const cutoff = olderThan.getTime();
    const ids = await client.zrangebyscore(this.zProcessed, '-inf', cutoff);
    if (ids.length === 0) return;

    const pipeline = client.pipeline();
    ids.forEach((id) => {
      pipeline.del(this.itemKey(id));
      pipeline.zrem(this.zProcessed, id);
      pipeline.zrem(this.zUnprocessed, id);
    });
    await pipeline.exec();
  }
}
