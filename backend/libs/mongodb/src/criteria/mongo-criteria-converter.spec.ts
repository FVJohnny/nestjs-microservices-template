import type { Collection } from 'mongodb';
import { MongoCriteriaConverter } from './mongo-criteria-converter';
import { MongodbTestService } from '../testing/mongodb-test.service';
import {
  testCriteriaConverterContract,
  type TestEntityDTO,
} from '@libs/nestjs-common/test-exports';

describe('MongoCriteriaConverter', () => {
  const mongoTestService = new MongodbTestService('criteria_converter_test_db');
  let collection: Collection<TestEntityDTO>;

  const TEST_COLLECTION_NAME = 'test_entities';

  beforeAll(async () => {
    const db = mongoTestService.mongoClient.db('criteria_converter_test_db');
    collection = db.collection<TestEntityDTO>(TEST_COLLECTION_NAME);
  });

  afterAll(async () => {
    await mongoTestService.cleanupDatabase();
  });

  beforeEach(async () => {
    await mongoTestService.clearCollection(TEST_COLLECTION_NAME);
  });

  // Run the shared contract tests
  testCriteriaConverterContract('MongoDB Implementation', async (entities: TestEntityDTO[]) => {
    await mongoTestService.clearCollection(TEST_COLLECTION_NAME);
    if (entities.length > 0) {
      await collection.insertMany(entities);
    }
    return new MongoCriteriaConverter(collection);
  });
});
