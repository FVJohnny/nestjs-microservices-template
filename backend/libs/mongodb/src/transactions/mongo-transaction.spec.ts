import { EntityExample, InMemoryTestRepository, Transaction } from '@libs/nestjs-common';
import { ExampleMongoRepository } from '../infrastructure/example-mongo.repository';
import { MongodbTestService } from '../testing/mongodb-test.service';

describe('Mongo transactions', () => {
  const setup = async () => {
    const mongoTestService = new MongodbTestService('mongo_transaction_test_db');
    await mongoTestService.setupDatabase();

    const mongoRepository = new ExampleMongoRepository(mongoTestService.mongoClient);
    await mongoRepository.ensureIndexes();

    const inMemoryRepository = new InMemoryTestRepository();
    return { mongoRepository, inMemoryRepository, mongoTestService };
  };

  it('commits all writes when each save succeeds', async () => {
    const { mongoRepository, mongoTestService } = await setup();

    const firstAggregate = EntityExample.create('value-1');
    const secondAggregate = EntityExample.create('value-2');

    await Transaction.run(async (context) => {
      await mongoRepository.save(firstAggregate, context);
      await mongoRepository.save(secondAggregate, context);
    });

    await expect(mongoRepository.findById(firstAggregate.id)).resolves.toMatchObject({
      value: 'value-1',
    });
    await expect(mongoRepository.findById(secondAggregate.id)).resolves.toMatchObject({
      value: 'value-2',
    });

    await mongoTestService.cleanupDatabase();
  });

  it('rolls back writes when a failure occurs', async () => {
    const { mongoRepository, mongoTestService } = await setup();
    const firstAggregate = EntityExample.create('value-1');
    const secondAggregate = EntityExample.create('value-2');

    await expect(
      Transaction.run(async (context) => {
        await mongoRepository.save(firstAggregate, context);
        await mongoRepository.save(secondAggregate, context);
        throw new Error('forced failure');
      }),
    ).rejects.toThrow('forced failure');

    await expect(mongoRepository.findById(firstAggregate.id)).resolves.toBeNull();
    await expect(mongoRepository.findById(secondAggregate.id)).resolves.toBeNull();

    await mongoTestService.cleanupDatabase();
  });

  describe('with in-memory participant', () => {
    it('commits both mongo and in-memory writes when successful', async () => {
      const { mongoRepository, inMemoryRepository, mongoTestService } = await setup();

      const aggregate = EntityExample.create('composed-success');

      await Transaction.run(async (context) => {
        await mongoRepository.save(aggregate, context);
        await inMemoryRepository.save(aggregate, context);
      });

      await expect(mongoRepository.findById(aggregate.id)).resolves.toMatchObject({
        value: 'composed-success',
      });
      await expect(inMemoryRepository.findById(aggregate.id)).resolves.toMatchObject({
        value: 'composed-success',
      });

      await mongoTestService.cleanupDatabase();
    });

    it('rolls back mongo and in-memory writes when an error occurs', async () => {
      const { mongoRepository, inMemoryRepository, mongoTestService } = await setup();

      const aggregate = EntityExample.create('composed-rollback');

      await expect(
        Transaction.run(async (context) => {
          await mongoRepository.save(aggregate, context);
          await inMemoryRepository.save(aggregate, context);
          throw new Error('forced failure');
        }),
      ).rejects.toThrow('forced failure');

      await expect(mongoRepository.findById(aggregate.id)).resolves.toBeNull();
      await expect(inMemoryRepository.findById(aggregate.id)).resolves.toBeNull();

      await mongoTestService.cleanupDatabase();
    });
  });
});
