import { UserToken_InMemory_Repository } from './user-token-in-memory.repository';
import { testUserTokenRepositoryContract } from '@bc/auth/domain/repositories/user-token/user-token.repository.spec';

describe('UserTokenInMemoryRepository', () => {
  testUserTokenRepositoryContract(
    'In-Memory Implementation',
    async () => new UserToken_InMemory_Repository(),
  );
});
