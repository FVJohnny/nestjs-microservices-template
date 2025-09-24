import type { ClientSession } from 'mongodb';
import type { TransactionContext } from '@libs/nestjs-common';

/**
 * MongoDB-specific transaction context that wraps a ClientSession.
 */
export class MongoTransactionContext implements TransactionContext {
  constructor(public readonly session: ClientSession) {}
}
