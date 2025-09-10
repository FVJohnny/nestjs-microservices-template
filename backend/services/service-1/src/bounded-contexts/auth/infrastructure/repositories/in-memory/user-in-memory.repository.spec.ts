import { UserInMemoryRepository } from './user-in-memory.repository';
import { testUserRepositoryContract } from '../../../domain/repositories/user.repository.spec';

describe('UserInMemoryRepository', () => {
  // Run the shared contract tests
  testUserRepositoryContract('In-Memory Implementation', async () => {
    return new UserInMemoryRepository();
  });
});
