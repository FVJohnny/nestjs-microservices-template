import type { RepositoryContext } from './repository-context';
import { DistributedTransactionContext } from './distributed-transaction-context';
import { CorrelationLogger } from '../logger';

export class Transaction {
  protected readonly logger: CorrelationLogger = new CorrelationLogger(this.constructor.name);

  static async run(work: (context: RepositoryContext) => Promise<void>): Promise<void> {
    const transactionContext = new DistributedTransactionContext();

    try {
      await work({ transaction: transactionContext });
      await transactionContext.commit();
    } catch (error) {
      await transactionContext.rollback();
      throw error;
    } finally {
      await transactionContext.dispose();
    }
  }
}
