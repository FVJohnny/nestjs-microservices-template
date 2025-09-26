import { InMemoryBaseRepository } from '../general';
import type { EntityExampleDTO } from '../general/domain/entities/EntityExample';
import { EntityExample } from '../general/domain/entities/EntityExample';
import { Transaction } from './transaction';

class InMemoryTestRepository extends InMemoryBaseRepository<EntityExample, EntityExampleDTO> {
  constructor(shouldFail = false) {
    super(shouldFail);
  }

  protected toEntity(dto: EntityExampleDTO): EntityExample {
    return EntityExample.fromValue(dto);
  }
}

describe('In-memory transactions', () => {
  let repository: InMemoryTestRepository;

  beforeEach(() => {
    repository = new InMemoryTestRepository();
  });

  it('commits new saves when the transaction succeeds', async () => {
    const aggregate = EntityExample.create('value-1');

    await Transaction.run(async (context) => {
      await repository.save(aggregate, context);
    });

    await expect(repository.findById(aggregate.id)).resolves.toMatchObject({ value: 'value-1' });
  });

  it('rolls back new saves when the transaction fails', async () => {
    const aggregate = EntityExample.create('value-rollback');

    await expect(
      Transaction.run(async (context) => {
        await repository.save(aggregate, context);
        throw new Error('forced failure');
      }),
    ).rejects.toThrow('forced failure');

    await expect(repository.findById(aggregate.id)).resolves.toBeNull();
  });

  it('restores previous state of updated aggregates on rollback', async () => {
    const original = EntityExample.create('initial');
    await repository.save(original);

    const updated = EntityExample.create('updated', original.id);

    await expect(
      Transaction.run(async (context) => {
        await repository.save(updated, context);
        throw new Error('update failure');
      }),
    ).rejects.toThrow('update failure');

    await expect(repository.findById(original.id)).resolves.toMatchObject({ value: 'initial' });
  });

  it('restores removed aggregates when a transaction rolls back', async () => {
    const aggregate = EntityExample.create('to-remove');
    await repository.save(aggregate);

    await expect(
      Transaction.run(async (context) => {
        await repository.remove(aggregate.id, context);
        throw new Error('remove failure');
      }),
    ).rejects.toThrow('remove failure');

    await expect(repository.findById(aggregate.id)).resolves.toMatchObject({ value: 'to-remove' });
  });

  it('restores cleared repositories when a transaction rolls back', async () => {
    const first = EntityExample.create('first');
    const second = EntityExample.create('second');

    await repository.save(first);
    await repository.save(second);

    await expect(
      Transaction.run(async (context) => {
        await repository.clear(context);
        throw new Error('clear failure');
      }),
    ).rejects.toThrow('clear failure');

    await expect(repository.findById(first.id)).resolves.toMatchObject({ value: 'first' });
    await expect(repository.findById(second.id)).resolves.toMatchObject({ value: 'second' });
  });
});
