import { GetTokensFromRefreshTokenQueryHandler } from './get-tokens-from-refresh-token.query-handler';
import { GetTokensFromRefreshTokenQuery } from './get-tokens-from-refresh-token.query';
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

describe('GetTokensFromRefreshTokenQueryHandler', () => {
  const createQuery = (refreshToken: string = 'valid-refresh-token') =>
    new GetTokensFromRefreshTokenQuery(refreshToken);

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
    const handler = new GetTokensFromRefreshTokenQueryHandler(
      repository,
      jwtTokenService as unknown as JwtTokenService,
    );

    let user: User | null = null;
    if (withUser) {
      const userId = jwtMockOptions.mockVerifyRefreshToken?.userId 
        ? new Id(jwtMockOptions.mockVerifyRefreshToken.userId)
        : Id.random();
      
      user = User.random({ 
        id: userId,
        status: userStatus === 'active' ? UserStatus.active() : UserStatus.inactive() 
      });
      await repository.save(user);
    }

    return { repository, jwtTokenService, handler, user };
  };

  it('should successfully refresh tokens for valid refresh token', async () => {
    // Arrange
    const { handler } = await setup({
      withUser: true,
      userStatus: 'active',
      jwtMockOptions: {
        mockVerifyRefreshToken: {
          userId: Id.random().toValue(),
        },
      }
    });

    const query = createQuery('mock-refresh-token');

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
    const query = createQuery('');

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid refresh token', async () => {
    // Arrange
    const { handler } = await setup({ 
      jwtMockOptions: { shouldFail: true } 
    });
    const query = createQuery();

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
    const query = createQuery('valid-refresh-token');

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    // Arrange
    const { handler } = await setup({
      withUser: true,
      userStatus: 'inactive',
      jwtMockOptions: {
        mockVerifyRefreshToken: {
          userId: Id.random().toValue(),
        }
      }
    });

    const query = createQuery('valid-refresh-token');

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
  });
});