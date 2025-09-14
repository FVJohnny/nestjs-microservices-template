import { UserInMemoryRepository } from './user-in-memory.repository';
import { testUserRepositoryContract } from '@bc/auth/domain/repositories/user/user.repository.spec';

describe('UserInMemoryRepository', () => {
  // Run the shared contract tests
  testUserRepositoryContract('In-Memory Implementation', async () => {
    return new UserInMemoryRepository();
  });
});
