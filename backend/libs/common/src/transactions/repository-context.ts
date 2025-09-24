import type { TransactionContext } from './transaction-context';

/**
 * Optional metadata that can be provided to repositories when executing operations.
 *
 * The transaction property allows infrastructure adapters to participate in an ongoing unit of work
 * without leaking framework-specific types to the domain layer.
 */
export interface RepositoryContext {
  readonly transaction?: TransactionContext;
}
