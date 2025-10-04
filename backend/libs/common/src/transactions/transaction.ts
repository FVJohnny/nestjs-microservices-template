import type { RepositoryContext } from './repository-context';
import { DistributedTransactionContext } from './distributed-transaction-context';
import { CorrelationLogger } from '../logger';
import { WithSpan } from '../tracing';

export class Transaction {
  protected readonly logger: CorrelationLogger = new CorrelationLogger(this.constructor.name);

  @WithSpan('transaction.run')
  static async run(work: (context: RepositoryContext) => Promise<void>): Promise<void> {
    const transactionContext = new DistributedTransactionContext();

    try {
      await work({ transaction: transactionContext });
      await this.commit(transactionContext);
    } catch (error) {
      await this.rollback(transactionContext);
      throw error;
    } finally {
      await this.dispose(transactionContext);
    }
  }

  @WithSpan('transaction.commit')
  private static async commit(transactionContext: DistributedTransactionContext): Promise<void> {
    await transactionContext.commit();
  }

  @WithSpan('transaction.rollback')
  private static async rollback(transactionContext: DistributedTransactionContext): Promise<void> {
    await transactionContext.rollback();
  }

  @WithSpan('transaction.dispose')
  private static async dispose(transactionContext: DistributedTransactionContext): Promise<void> {
    await transactionContext.dispose();
  }
}
