import { EntityExample, InMemoryTestRepository } from '@libs/nestjs-common';
import { Transaction } from '@libs/nestjs-common';
import { RedisTestService } from '../testing/redis-test.service';
import { TestRepository } from '../infrastructure/example-redis.repository';

describe('Redis transactions', () => {
  const redisTestService = new RedisTestService(2);
  let repository: TestRepository;

  beforeAll(async () => {
    await redisTestService.setupDatabase();
    repository = new TestRepository(redisTestService.redisClient);
  });

  afterEach(async () => {
    await redisTestService.clearKeys('transaction-test:*');
  });

  afterAll(async () => {
    await redisTestService.cleanupDatabase();
  });

  it('persists all writes when every save succeeds', async () => {
    await Transaction.run(async (context) => {
      await repository.save('first', 'value-1', context);
      await repository.save('second', 'value-2', context);
    });

    await expect(repository.find('first')).resolves.toBe('value-1');
    await expect(repository.find('second')).resolves.toBe('value-2');
  });

  it('cancels writes when the second save throws exception', async () => {
    await expect(
      Transaction.run(async (context) => {
        await repository.save('first', 'value-1', context);
        await repository.save('second', 'value-2', context);
        throw new Error('forced failure');
      }),
    ).rejects.toThrow('forced failure');

    await expect(repository.find('first')).resolves.toBeNull();
    await expect(repository.find('second')).resolves.toBeNull();
  });

  describe('with in-memory participant', () => {
    let inMemoryRepository: InMemoryTestRepository;

    beforeEach(() => {
      inMemoryRepository = new InMemoryTestRepository();
    });

    it('commits redis and in-memory writes when successful', async () => {
      const aggregate = EntityExample.create('in-memory-1');

      await Transaction.run(async (context) => {
        await repository.save('first', 'value-1', context);
        await inMemoryRepository.save(aggregate, context);
      });

      await expect(repository.find('first')).resolves.toBe('value-1');
      await expect(inMemoryRepository.findById(aggregate.id)).resolves.toMatchObject({
        value: 'in-memory-1',
      });
    });

    it('rolls back in-memory and redis writes when an error occurs', async () => {
      const aggregate = EntityExample.create('in-memory-rollback');

      await expect(
        Transaction.run(async (context) => {
          await repository.save('first', 'value-1', context);
          await inMemoryRepository.save(aggregate, context);
          await repository.save('second', 'value-2', context);
          throw new Error('forced failure');
        }),
      ).rejects.toThrow('forced failure');

      await expect(repository.find('first')).resolves.toBeNull();
      await expect(repository.find('second')).resolves.toBeNull();
      await expect(inMemoryRepository.findById(aggregate.id)).resolves.toBeNull();
    });
  });
});
