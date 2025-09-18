import { GetTokensFromRefreshToken_QueryHandler } from './get-tokens-from-refresh-token.query-handler';
import { GetTokensFromRefreshToken_Query } from './get-tokens-from-refresh-token.query';
import { User_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { Email, Username, UserRole, UserStatus } from '@bc/auth/domain/value-objects';
import type { TokenPayload } from '@libs/nestjs-common';
import { Id, JwtTokenService, UnauthorizedException } from '@libs/nestjs-common';
import { JwtService } from '@nestjs/jwt';

describe('GetTokensFromRefreshToken_QueryHandler', () => {
  const setup = async (
    params: {
      withUser?: boolean;
      userStatus?: 'active' | 'inactive';
      shouldFailRepository?: boolean;
    } = {},
  ) => {
    const { withUser = false, userStatus = 'active', shouldFailRepository = false } = params;

    const repository = new User_InMemory_Repository(shouldFailRepository);
    const jwtTokenService = new JwtTokenService(new JwtService());
    const handler = new GetTokensFromRefreshToken_QueryHandler(repository, jwtTokenService);

    let user: User | null = null;
    if (withUser) {
      user = User.random({
        id: Id.random(),
        status: userStatus === 'active' ? UserStatus.active() : UserStatus.inactive(),
      });
      await repository.save(user);
    }

    return { repository, jwtTokenService, handler, user };
  };

  it('should successfully refresh tokens for valid refresh token', async () => {
    // Arrange
    const { handler, user, jwtTokenService } = await setup({
      withUser: true,
      userStatus: 'active',
    });

    const payload: TokenPayload = {
      userId: user!.id.toValue(),
      email: user!.email.toValue(),
      username: user!.username.toValue(),
      role: user!.role.toValue(),
    };
    const refreshToken = jwtTokenService.generateRefreshToken(payload);
    const query = new GetTokensFromRefreshToken_Query(refreshToken);
    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    const decodedAccessToken = jwtTokenService.verifyAccessToken(result.accessToken);
    expect(decodedAccessToken.userId).toBe(payload.userId);
    expect(decodedAccessToken.email).toBe(payload.email);
    expect(decodedAccessToken.username).toBe(payload.username);
    expect(decodedAccessToken.role).toBe(payload.role);

    const decodedRefreshToken = jwtTokenService.verifyRefreshToken(result.refreshToken);
    expect(decodedRefreshToken.userId).toBe(payload.userId);
    expect(decodedRefreshToken.email).toBe(payload.email);
    expect(decodedRefreshToken.username).toBe(payload.username);
    expect(decodedRefreshToken.role).toBe(payload.role);
  });

  it('should throw UnauthorizedException for empty refresh token', async () => {
    // Arrange
    const { handler } = await setup();
    const query = new GetTokensFromRefreshToken_Query('');

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for invalid refresh token', async () => {
    // Arrange
    const { handler } = await setup({});
    const query = new GetTokensFromRefreshToken_Query('invalid-refresh-token');

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user not found', async () => {
    // Arrange
    const { handler, jwtTokenService } = await setup({});
    const payload: TokenPayload = {
      userId: Id.random().toValue(),
      email: Email.random().toValue(),
      username: Username.random().toValue(),
      role: UserRole.random().toValue(),
    };
    const refreshToken = jwtTokenService.generateRefreshToken(payload);
    const query = new GetTokensFromRefreshToken_Query(refreshToken);

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    // Arrange
    const { handler, user, jwtTokenService } = await setup({
      withUser: true,
      userStatus: 'inactive',
    });

    const payload: TokenPayload = {
      userId: user!.id.toValue(),
      email: user!.email.toValue(),
      username: user!.username.toValue(),
      role: user!.role.toValue(),
    };
    const refreshToken = jwtTokenService.generateRefreshToken(payload);
    const query = new GetTokensFromRefreshToken_Query(refreshToken);

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(UnauthorizedException);
  });
});
