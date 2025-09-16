import { EmailVerification_Mongodb_Repository } from './email-verification-mongodb.repository';
import { testEmailVerificationRepositoryContract } from '@bc/auth/domain/repositories/email-verification/email-verification.repository.spec';
import { MongodbTestService } from '@libs/nestjs-mongodb';

describe('EmailVerificationMongodbRepository (Integration)', () => {
  const mongoTestService = new MongodbTestService('email_verifications_test_db');

  testEmailVerificationRepositoryContract(
    'MongoDB Implementation',
    async () => new EmailVerification_Mongodb_Repository(mongoTestService.mongoClient),
    {
      beforeAll: () => mongoTestService.setupDatabase(),
      afterAll: () => mongoTestService.cleanupDatabase(),
      beforeEach: () => mongoTestService.clearCollection('email_verifications'),
    },
  );
});
