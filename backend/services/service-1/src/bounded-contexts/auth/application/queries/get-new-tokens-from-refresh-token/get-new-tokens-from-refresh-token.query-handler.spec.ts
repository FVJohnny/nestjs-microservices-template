import { GetNewTokensFromRefreshTokenQueryHandler } from './get-new-tokens-from-refresh-token.query-handler';
import { GetNewTokensFromRefreshTokenQuery } from './get-new-tokens-from-refresh-token.query';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { UserStatus } from '@bc/auth/domain/value-objects';
import { 
  Id,
  JwtTokenService,
  JwtTokenServiceMockOptions,
  UnauthorizedException, 
  createJwtTokenServiceMock
} from '@libs/nestjs-common';

describe('GetNewTokensFromRefreshTokenQueryHandler', () => {
  // Setup factory
  const setup = async (
    params: { 
      withUser?: boolean;
      userStatus?: 'active' | 'inactive';
      shouldFailRepository?: boolean; 
      jwtMockOptions?: JwtTokenServiceMockOptions;
    } = {}
  ) => {
    const { 
      withUser = false,
      userStatus = 'active',
      shouldFailRepository = false, 
      jwtMockOptions = {} 
    } = params;

    const repository = new UserInMemoryRepository(shouldFailRepository);
    const jwtTokenService = createJwtTokenServiceMock(jwtMockOptions);
    const handler = new GetNewTokensFromRefreshTokenQueryHandler(
      repository,
      jwtTokenService as unknown as JwtTokenService,
    );

    let user: User | null = null;
    if (withUser) {
      user = User.random({ 
        status: userStatus === 'active' ? UserStatus.active() : UserStatus.inactive() 
      });
      await repository.save(user);
    }

    return { repository, jwtTokenService, handler, user };
  };

  describe('execute', () => {
    it('should successfully refresh tokens for valid refresh token', async () => {
      // Arrange
      const { handler, user } = await setup({
        withUser: true,
        userStatus: 'active',
        jwtMockOptions: {
          mockVerifyRefreshToken: {
            userId: 'user-id-placeholder', // Will be updated below
          },
        }
      });

      // Update the mock to use the actual user ID
      const jwtTokenService = createJwtTokenServiceMock({
        mockVerifyRefreshToken: {
          userId: user!.id.toValue(),
        },
      });
      (handler as any).jwtTokenService = jwtTokenService;

      const query = new GetNewTokensFromRefreshTokenQuery('mock-refresh-token');

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should throw UnauthorizedException for empty refresh token', async () => {
      // Arrange
      const { handler } = await setup();
      const query = new GetNewTokensFromRefreshTokenQuery('');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const { handler } = await setup({ 
        jwtMockOptions: { shouldFail: true } 
      });
      const query = new GetNewTokensFromRefreshTokenQuery('invalid-refresh-token');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const { handler } = await setup({
        jwtMockOptions: {
          mockVerifyRefreshToken: {
            userId: Id.random().toValue(),
          },
        }
      });
      const query = new GetNewTokensFromRefreshTokenQuery('valid-refresh-token');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      // Arrange
      const { handler, user } = await setup({
        withUser: true,
        userStatus: 'inactive',
        jwtMockOptions: {
          mockVerifyRefreshToken: {
            userId: 'user-id-placeholder', // Will be updated below
          },
        }
      });

      // Update the mock to use the actual user ID
      const jwtTokenService = createJwtTokenServiceMock({
        mockVerifyRefreshToken: {
          userId: user!.id.toValue(),
        },
      });
      (handler as any).jwtTokenService = jwtTokenService;

      const query = new GetNewTokensFromRefreshTokenQuery('valid-refresh-token');

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
    });
  });
});