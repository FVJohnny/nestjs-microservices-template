import { EmailVerification_Mongodb_Repository } from './email-verification-mongodb.repository';
import { testEmailVerificationRepositoryContract } from '@bc/auth/domain/repositories/email-verification/email-verification.repository.spec';
import { MongodbTestService } from '@libs/nestjs-mongodb';
import type { EmailVerificationDTO } from '@bc/auth/domain/entities/email-verification/email-verification.dto';

describe('EmailVerificationMongodbRepository (Integration)', () => {
  const mongoTestService = new MongodbTestService<EmailVerificationDTO>(
    EmailVerification_Mongodb_Repository.CollectionName,
  );

  testEmailVerificationRepositoryContract(
    'MongoDB Implementation',
    async () => new EmailVerification_Mongodb_Repository(mongoTestService.mongoClient),
    {
      beforeAll: () => mongoTestService.setupDatabase(),
      beforeEach: () => mongoTestService.clearCollection(),
      afterAll: () => mongoTestService.cleanup(),
    },
  );
});
