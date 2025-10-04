import type { RepositoryContext } from './repository-context';
import { DistributedTransactionContext } from './distributed-transaction-context';
import { CorrelationLogger } from '../logger';
import { TracingService } from '../tracing';

export class Transaction {
  protected readonly logger: CorrelationLogger = new CorrelationLogger(this.constructor.name);

  static async run(work: (context: RepositoryContext) => Promise<void>): Promise<void> {
    const transactionContext = new DistributedTransactionContext();

    try {
      await TracingService.withSpan('transaction.run', async () => {
        await work({ transaction: transactionContext });
        await transactionContext.commit();
      });
    } catch (error) {
      await TracingService.withSpan('transaction.rollback', async () => {
        await transactionContext.rollback();
      });
      throw error;
    } finally {
      await TracingService.withSpan('transaction.dispose', async () => {
        await transactionContext.dispose();
      });
    }
  }
}
