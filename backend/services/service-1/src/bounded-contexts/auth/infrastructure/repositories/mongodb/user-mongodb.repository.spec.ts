import { User_Mongodb_Repository } from './user-mongodb.repository';
import { testUserRepositoryContract } from '@bc/auth/domain/repositories/user/user.repository.spec';
import { MongodbTestService } from '@libs/nestjs-mongodb';
import type { UserDTO } from '@bc/auth/domain/entities/user/user.dto';

describe('UserMongodbRepository (Integration)', () => {
  const mongoTestService = new MongodbTestService<UserDTO>(User_Mongodb_Repository.CollectionName);

  testUserRepositoryContract(
    'MongoDB Implementation',
    async () => new User_Mongodb_Repository(mongoTestService.mongoClient),
    {
      beforeAll: () => mongoTestService.setupDatabase(),
      beforeEach: () => mongoTestService.clearCollection(),
      afterAll: () => mongoTestService.cleanup(),
    },
  );
});
