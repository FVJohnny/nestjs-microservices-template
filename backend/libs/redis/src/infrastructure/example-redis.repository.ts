import { BaseRedisRepository } from '../base-redis.repository';
import type { RepositoryContext } from '@libs/nestjs-common';
import type { Redis } from 'ioredis';

export class TestRepository extends BaseRedisRepository {
  private readonly keyPrefix = 'transaction-test:';

  constructor(redisClient: Redis) {
    super(redisClient);
  }

  async save(id: string, value: string, context?: RepositoryContext) {
    this.registerTransactionParticipant(context);

    const client = this.getClient(context);
    await client.set(this.key(id), value);
  }

  async find(id: string): Promise<string | null> {
    return this.getRedisClient().get(this.key(id));
  }

  private key(id: string): string {
    return `${this.keyPrefix}${id}`;
  }
}
