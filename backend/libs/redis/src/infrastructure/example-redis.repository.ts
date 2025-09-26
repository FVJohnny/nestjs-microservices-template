import { BaseRedisRepository } from '../base-redis.repository';
import { EntityExample } from '@libs/nestjs-common';
import type { Redis } from 'ioredis';

export class ExampleRedisRepository extends BaseRedisRepository<EntityExample> {
  private readonly keyPrefix = 'transaction-test:';

  constructor(redisClient: Redis) {
    super(redisClient);
  }

  protected itemKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  protected toEntity(json: string): EntityExample {
    return EntityExample.fromValue(JSON.parse(json));
  }
}
