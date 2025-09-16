import { User_Mongodb_Repository } from './user-mongodb.repository';
import { testUserRepositoryContract } from '@bc/auth/domain/repositories/user/user.repository.spec';
import { MongodbTestService } from '@libs/nestjs-mongodb';

describe('UserMongodbRepository (Integration)', () => {
  const mongoTestService = new MongodbTestService('users_test_db');

  testUserRepositoryContract(
    'MongoDB Implementation',
    async () => new User_Mongodb_Repository(mongoTestService.mongoClient),
    {
      beforeAll: () => mongoTestService.setupDatabase(),
      afterAll: () => mongoTestService.cleanupDatabase(),
      beforeEach: () => mongoTestService.clearCollection('users'),
    },
  );
});
