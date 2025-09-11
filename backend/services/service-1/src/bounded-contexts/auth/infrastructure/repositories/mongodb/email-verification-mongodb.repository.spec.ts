import { MongoClient } from 'mongodb';
import { EmailVerificationMongodbRepository } from './email-verification-mongodb.repository';
import { testEmailVerificationRepositoryContract } from '../../../domain/repositories/email-verification/email-verification.repository.spec';

describe('EmailVerificationMongodbRepository (Integration)', () => {
  let mongoClient: MongoClient;

  // Use existing MongoDB instance from docker-compose with credentials
  const TEST_DB_NAME = 'email_verifications_test_db';
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    `mongodb://admin:admin123@localhost:27017/${TEST_DB_NAME}?authSource=admin`;

  // Helper functions
  const setupDatabase = async (): Promise<void> => {
    try {
      console.log('Connecting to existing MongoDB instance...');
      console.log('MongoDB URI:', MONGODB_URI);

      // Create MongoDB client
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      console.log('Connected to MongoDB successfully');

      // Test connection
      await mongoClient.db().admin().ping();
      console.log('MongoDB ping successful');

      console.log('Test setup completed');
    } catch (error) {
      console.error('Error in database setup:', error);
      throw error;
    }
  };

  const cleanupDatabase = async (): Promise<void> => {
    try {
      await mongoClient?.db(TEST_DB_NAME).dropDatabase();
      console.log('Cleaned up test database');
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
    await mongoClient?.close();
  };

  const clearTestData = async (): Promise<void> => {
    const db = mongoClient.db(TEST_DB_NAME);
    await db.collection('email_verifications').deleteMany({});
  };

  // Run the shared contract tests
  testEmailVerificationRepositoryContract(
    'MongoDB Implementation',
    async () => {
      // Create repository instance that uses the test database
      return new EmailVerificationMongodbRepository(mongoClient);
    },
    {
      beforeAll: setupDatabase,
      afterAll: cleanupDatabase,
      beforeEach: clearTestData,
    },
  );
});