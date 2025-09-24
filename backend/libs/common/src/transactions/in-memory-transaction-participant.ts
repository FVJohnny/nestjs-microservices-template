import type { TransactionParticipant } from './transaction-participant';
import type { InMemoryBaseRepository } from '../general/infrastructure/in-memory-base.repository';
import type { SharedAggregateRoot, SharedAggregateRootDTO } from '../general/domain';

export class InMemoryTransactionParticipant<
  TEnt extends SharedAggregateRoot,
  TDto extends SharedAggregateRootDTO,
> implements TransactionParticipant
{
  private readonly snapshots = new Map<InMemoryBaseRepository<TEnt, TDto>, Map<string, TDto>>();

  saveSnapshot(repository: InMemoryBaseRepository<TEnt, TDto>, snapshot: Map<string, TDto>) {
    if (!this.snapshots.has(repository)) {
      this.snapshots.set(repository, snapshot);
    }
  }

  async rollback() {
    for (const [repository, snapshot] of this.snapshots.entries()) {
      repository.restoreFromSnapshot(snapshot);
    }
    this.snapshots.clear();
  }

  async commit() {}

  async dispose() {
    this.snapshots.clear();
  }
}
