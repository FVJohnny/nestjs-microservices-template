import type { Db, Collection } from 'mongodb';
import { MongoClient } from 'mongodb';
import { MongoCriteriaConverter } from './mongo-criteria-converter';
import { testCriteriaConverterContract, type TestEntityDTO } from '@libs/nestjs-common';

describe('MongoCriteriaConverter', () => {
  let mongoClient: MongoClient;
  let db: Db;
  let collection: Collection<TestEntityDTO>;

  const TEST_DB_NAME = 'criteria_converter_test_db';
  const TEST_COLLECTION_NAME = 'test_entities';
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    `mongodb://admin:admin123@localhost:27017/${TEST_DB_NAME}?authSource=admin`;

  beforeAll(async () => {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db(TEST_DB_NAME);
    collection = db.collection<TestEntityDTO>(TEST_COLLECTION_NAME);
  });

  afterAll(async () => {
    await db.dropDatabase();
    await mongoClient.close();
  });

  beforeEach(async () => {
    await collection.deleteMany({});
  });

  // Run the shared contract tests
  testCriteriaConverterContract('MongoDB Implementation', async (entities: TestEntityDTO[]) => {
    await collection.deleteMany({});
    if (entities.length > 0) {
      await collection.insertMany(entities);
    }
    return new MongoCriteriaConverter(collection);
  });
});
