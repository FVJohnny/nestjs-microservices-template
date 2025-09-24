import type { ChainableCommander, Redis } from 'ioredis';
import { CorrelationLogger } from '@libs/nestjs-common';
import type { RepositoryContext } from '@libs/nestjs-common';

import { RedisTransactionParticipant } from './transactions/redis-transaction-participant';

export abstract class BaseRedisRepository {
  protected readonly logger: CorrelationLogger;

  constructor(private readonly redisClient: Redis) {
    this.logger = new CorrelationLogger(this.constructor.name);
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
    const transaction = context?.transaction;

    if (!transaction) {
      return;
    }

    let participant = transaction.get('redis') as RedisTransactionParticipant;
    if (!participant) {
      participant = new RedisTransactionParticipant(this.redisClient);
      transaction.register('redis', participant);
    }
  }
}
