import { EmailVerificationMongodbRepository } from './email-verification-mongodb.repository';
import { testEmailVerificationRepositoryContract } from '@bc/auth/domain/repositories/email-verification/email-verification.repository.spec';
import { MongodbTestService } from '@libs/nestjs-mongodb';

describe('EmailVerificationMongodbRepository (Integration)', () => {
  const mongoTestService = new MongodbTestService('email_verifications_test_db');

  testEmailVerificationRepositoryContract(
    'MongoDB Implementation',
    async () => new EmailVerificationMongodbRepository(mongoTestService.mongoClient),
    {
      beforeAll: () => mongoTestService.setupDatabase(),
      afterAll: () => mongoTestService.cleanupDatabase(),
      beforeEach: () => mongoTestService.clearCollection('email_verifications'),
    },
  );
});