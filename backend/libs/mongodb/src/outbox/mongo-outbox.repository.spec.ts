import { MongoOutboxRepository } from './mongo-outbox.repository';
import { testOutboxRepositoryContract } from '@libs/nestjs-common';
import type { Db } from 'mongodb';
import { MongoClient } from 'mongodb';
import type { MongoDBConfigService } from '../mongodb-config.service';

describe('MongoOutboxRepository', () => {
  let mongoClient: MongoClient;
  let db: Db;
  let configService: MongoDBConfigService;

  // Use existing MongoDB instance from docker-compose
  const TEST_DB_NAME = 'outbox_test_db';
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    `mongodb://admin:admin123@localhost:27017/${TEST_DB_NAME}?authSource=admin`;

  beforeAll(async () => {
    // Connect to existing MongoDB instance
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();

    // Test connection
    await mongoClient.db().admin().ping();

    db = mongoClient.db(TEST_DB_NAME);

    // Setup config service mock
    configService = {
      getDatabaseName: jest.fn().mockReturnValue(TEST_DB_NAME),
    } as unknown as MongoDBConfigService;
  }, 30000);

  afterAll(async () => {
    try {
      await mongoClient?.db(TEST_DB_NAME).dropDatabase();
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
    await mongoClient?.close();
  }, 30000);

  const cleanup = async () => {
    // Clean up the collection after each test
    const collection = db.collection('outbox_events');
    await collection.deleteMany({});
  };

  // Run the shared contract tests
  testOutboxRepositoryContract(
    'MongoDB Implementation',
    async () => {
      await cleanup(); // Clean before each test
      const repo = new MongoOutboxRepository(mongoClient, configService);
      await repo.onModuleInit();
      return repo;
    },
    cleanup, // Clean after each test
  );
});
