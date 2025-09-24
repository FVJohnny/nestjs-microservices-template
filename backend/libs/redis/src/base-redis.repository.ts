import type { ChainableCommander, Redis } from 'ioredis';
import { CorrelationLogger } from '@libs/nestjs-common';
import type { RepositoryContext } from '@libs/nestjs-common';

import { RedisTransactionContext } from './transactions/redis-transaction-context';

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
    const transaction = context?.transaction as RedisTransactionContext | undefined;
    return transaction?.pipeline;
  }

  protected isTransactional(context?: RepositoryContext): boolean {
    return !!this.getTransactionClient(context);
  }

  async withTransaction(work: (context: RepositoryContext) => Promise<void>): Promise<void> {
    const pipeline = this.redisClient.multi();
    const context: RepositoryContext = {
      transaction: new RedisTransactionContext(pipeline),
    };

    let executed = false;
    try {
      await work(context);

      const results = await pipeline.exec();
      executed = true;

      if (Array.isArray(results)) {
        for (const [error] of results) {
          if (error) {
            throw error;
          }
        }
      }
    } catch (error) {
      if (!executed) {
        try {
          pipeline.discard();
        } catch (discardError) {
          this.logger.error(
            'Failed to discard Redis transaction',
            discardError instanceof Error ? discardError : String(discardError),
          );
        }
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
