import { PasswordReset_Mongodb_Repository } from './password-reset.mongodb-repository';
import { testPasswordResetRepositoryContract } from '@bc/auth/domain/repositories/password-reset/password-reset.repository.spec';
import { MongodbTestService } from '@libs/nestjs-mongodb';
import type { PasswordResetDTO } from '@bc/auth/domain/entities/password-reset/password-reset.dto';

describe('PasswordResetMongodbRepository (Integration)', () => {
  const mongoTestService = new MongodbTestService<PasswordResetDTO>(
    PasswordReset_Mongodb_Repository.CollectionName,
  );

  testPasswordResetRepositoryContract(
    'MongoDB Implementation',
    async () => new PasswordReset_Mongodb_Repository(mongoTestService.mongoClient),
    {
      beforeAll: () => mongoTestService.setupDatabase(),
      beforeEach: () => mongoTestService.clearCollection(),
      afterAll: () => mongoTestService.cleanup(),
    },
  );
});
