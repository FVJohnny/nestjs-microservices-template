import { Base_RedisRepository } from '../base.redis-repository';
import { EntityExample } from '@libs/nestjs-common';
import type { RedisService } from '../redis.service';

export class ExampleRedisRepository extends Base_RedisRepository<EntityExample> {
  private readonly keyPrefix = 'transaction-test:';

  constructor(redisService: RedisService) {
    super(redisService);
  }

  protected itemKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  protected toEntity(json: string): EntityExample {
    return EntityExample.fromValue(JSON.parse(json));
  }
}
