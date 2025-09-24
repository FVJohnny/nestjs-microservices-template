import type { ChainableCommander } from 'ioredis';
import type { TransactionContext } from '@libs/nestjs-common';

/**
 * Redis-specific transaction context that exposes the underlying multi pipeline.
 */
export class RedisTransactionContext implements TransactionContext {
  constructor(public readonly pipeline: ChainableCommander) {}
}
