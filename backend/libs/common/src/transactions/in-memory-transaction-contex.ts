import type { TransactionContext } from './transaction-context';
import type { InMemoryBaseRepository } from '../general/infrastructure/in-memory-base.repository';
import type { SharedAggregateRoot, SharedAggregateRootDTO } from '../general/domain';

export class InMemoryTransactionContext<
  TEnt extends SharedAggregateRoot,
  TDto extends SharedAggregateRootDTO,
> implements TransactionContext
{
  private readonly snapshots = new Map<InMemoryBaseRepository<TEnt, TDto>, Map<string, TDto>>();

  saveSnapshot(repository: InMemoryBaseRepository<TEnt, TDto>, snapshot: Map<string, TDto>) {
    if (!this.snapshots.has(repository)) {
      this.snapshots.set(repository, snapshot);
    }
  }

  rollback() {
    for (const [repository, snapshot] of this.snapshots.entries()) {
      repository.restoreFromSnapshot(snapshot);
    }
    this.snapshots.clear();
  }

  commit() {
    this.snapshots.clear();
  }
}
