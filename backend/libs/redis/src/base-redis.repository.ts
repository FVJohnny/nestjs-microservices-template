import type { ChainableCommander, Redis } from 'ioredis';
import { CorrelationLogger } from '@libs/nestjs-common';
import type { RepositoryContext, Id, Repository, SharedAggregateRoot } from '@libs/nestjs-common';

import { RedisTransactionParticipant } from './transactions/redis-transaction-participant';

export abstract class BaseRedisRepository<TEnt extends SharedAggregateRoot>
  implements Repository<TEnt, Id>
{
  protected readonly logger: CorrelationLogger;

  constructor(private readonly redisClient: Redis) {
    this.logger = new CorrelationLogger(this.constructor.name);
  }
  protected abstract itemKey(id: string): string;
  protected abstract toEntity(json: string): TEnt;

  async save(entity: TEnt, context?: RepositoryContext): Promise<void> {
    this.registerTransactionParticipant(context);
    const client = this.getClient(context);

    const v = entity.toValue();
    const key = this.itemKey(v.id);

    await client.set(key, JSON.stringify(v));
  }

  async findById(id: Id) {
    const client = this.getRedisClient();

    const key = this.itemKey(id.toValue());
    const json = await client.get(key);
    if (!json) return null;

    return this.toEntity(json);
  }

  async exists(id: Id): Promise<boolean> {
    const client = this.getRedisClient();
    const key = this.itemKey(id.toValue());

    const exists = await client.exists(key);
    return exists === 1;
  }

  async remove(id: Id, context?: RepositoryContext): Promise<void> {
    this.registerTransactionParticipant(context);
    const client = this.getClient(context);

    const key = this.itemKey(id.toValue());
    await client.del(key);
  }

  async clear(context?: RepositoryContext): Promise<void> {
    this.registerTransactionParticipant(context);
    const client = this.getClient(context);

    const keys = await this.getRedisClient().keys('*');
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  protected getClient(context?: RepositoryContext): Redis | ChainableCommander {
    return this.getTransactionClient(context) ?? this.redisClient;
  }

  protected getRedisClient(): Redis {
    return this.redisClient;
  }

  protected getTransactionClient(context?: RepositoryContext): ChainableCommander | undefined {
    const transaction = context?.transaction;

    if (!transaction) {
      return undefined;
    }

    const participant = transaction.get('redis') as RedisTransactionParticipant;
    return participant?.getPipeline();
  }

  protected isTransactional(context?: RepositoryContext): boolean {
    return !!this.getTransactionClient(context);
  }

  protected registerTransactionParticipant(context?: RepositoryContext) {
    if (!context) return;

    let participant = context.transaction.get('redis') as RedisTransactionParticipant;
    if (!participant) {
      participant = new RedisTransactionParticipant(this.redisClient);
      context.transaction.register('redis', participant);
    }
  }
}
