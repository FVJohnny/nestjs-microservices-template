import { UserToken_Redis_Repository } from './user-token-redis.repository';
import { testUserTokenRepositoryContract } from '@bc/auth/domain/repositories/user-token/user-token.repository.spec';
import { RedisTestService } from '@libs/nestjs-redis';
import type { UserTokenDTO } from '@bc/auth/domain/entities/user-token/user-token.dto';

describe('UserTokenRedisRepository (Integration)', () => {
  const redisTestService = new RedisTestService<UserTokenDTO>('user-token');

  testUserTokenRepositoryContract(
    'Redis Implementation',
    async () => new UserToken_Redis_Repository(redisTestService),
    {
      beforeAll: () => redisTestService.setupDatabase(),
      beforeEach: () => redisTestService.clear(),
      afterAll: () => redisTestService.closeDatabase(),
    },
  );
});
