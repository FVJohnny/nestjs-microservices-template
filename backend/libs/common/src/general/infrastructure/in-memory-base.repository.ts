import { InfrastructureException } from '../../errors';
import { type RepositoryContext, InMemoryTransactionContext } from '../../transactions';
import type { SharedAggregateRoot, Id, SharedAggregateRootDTO } from '../domain';
import type { Repository } from '../domain';

export abstract class InMemoryBaseRepository<
  TEnt extends SharedAggregateRoot,
  TDto extends SharedAggregateRootDTO,
> implements Repository<TEnt, Id>
{
  protected items: Map<string, TDto> = new Map();

  constructor(private shouldFail: boolean = false) {}

  protected abstract toEntity(dto: TDto): TEnt;

  protected toValue(entity: TEnt): TDto {
    return entity.toValue() as TDto;
  }

  async save(entity: TEnt, context?: RepositoryContext) {
    this.registerTransaction(context);
    this.validate('save');
    this.items.set(entity.id.toValue(), this.toValue(entity));
  }

  async findAll() {
    this.validate('findAll');
    return Array.from(this.items.values()).map((e) => this.toEntity(e));
  }

  async findById(id: Id) {
    this.validate('findById');
    const ent = this.items.get(id.toValue());
    return ent ? this.toEntity(ent) : null;
  }

  async exists(id: Id) {
    this.validate('exists');
    return !!(await this.findById(id));
  }

  async remove(id: Id, context?: RepositoryContext) {
    this.registerTransaction(context);
    this.validate('remove');
    this.items.delete(id.toValue());
  }

  async clear(context?: RepositoryContext) {
    this.registerTransaction(context);
    this.validate('clear');
    this.items.clear();
  }

  validate(operation: string): void {
    if (this.shouldFail) {
      throw new InfrastructureException(
        operation,
        `Failed to ${operation} OutboxEvent`,
        new Error(`Failed to ${operation} OutboxEvent`),
      );
    }
  }

  async withTransaction(work: (context: RepositoryContext) => Promise<void>) {
    const transaction = new InMemoryTransactionContext();

    try {
      await work({ transaction });
      transaction.commit();
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  }

  restoreFromSnapshot(snapshot: Map<string, TDto>): void {
    this.items = new Map(snapshot);
  }

  private registerTransaction(context?: RepositoryContext) {
    const transaction = context?.transaction as InMemoryTransactionContext<TEnt, TDto>;
    if (transaction) {
      transaction.saveSnapshot(this, new Map(this.items));
    }
  }
}
