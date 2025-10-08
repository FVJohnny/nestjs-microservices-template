import { User_InMemory_Repository } from './user.in-memory-repository';
import { testUserRepositoryContract } from '@bc/auth/domain/repositories/user/user.repository.spec';

describe('UserInMemoryRepository', () => {
  testUserRepositoryContract('In-Memory Implementation', async () => {
    return new User_InMemory_Repository();
  });
});
