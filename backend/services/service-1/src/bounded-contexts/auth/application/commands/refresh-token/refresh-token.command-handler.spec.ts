import { RefreshTokenCommandHandler } from './refresh-token.command-handler';
import { RefreshTokenCommand } from './refresh-token.command';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { UserStatus } from '@bc/auth/domain/value-objects';
import { 
  Id,
  JwtTokenService,
  JwtTokenServiceMockOptions,
  UnauthorizedException, 
  createEventBusMock,
  createJwtTokenServiceMock
} from '@libs/nestjs-common';
import { EventBus } from '@nestjs/cqrs';

describe('RefreshTokenCommandHandler', () => {
  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean; shouldFailEventBus?: boolean; jwtMockOptions?: JwtTokenServiceMockOptions,  } = {}) => {
    const { shouldFailRepository = false, shouldFailEventBus = false, jwtMockOptions = {} } = params;

    const repository = new UserInMemoryRepository(shouldFailRepository);
    const eventBus = createEventBusMock({ shouldFail: shouldFailEventBus });
    const jwtTokenService = createJwtTokenServiceMock(jwtMockOptions);
    const handler = new RefreshTokenCommandHandler(
      repository,
      jwtTokenService as unknown as JwtTokenService,
      eventBus as unknown as EventBus,
    );

    return { repository, eventBus, jwtTokenService, handler };
  };

  describe('execute', () => {
    it('should successfully refresh tokens for valid refresh token', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.active() });
      const { handler, repository } = setup({
        jwtMockOptions: {
          mockVerifyRefreshToken: {
            userId: user.id.toValue(),
          },
        }
      });

      await repository.save(user);
      const command = new RefreshTokenCommand('mock-refresh-token');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toEqual({
        userId: user.id.toValue(),
        email: user.email.toValue(),
        username: user.username.toValue(),
        role: user.role.toValue(),
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const { handler } = setup({ jwtMockOptions: { shouldFail: true } });
      const command = new RefreshTokenCommand('invalid-refresh-token');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const { handler } = setup();
      const command = new RefreshTokenCommand(Id.random().toValue());

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      // Arrange
      const user = User.random({ status: UserStatus.inactive() });
      const { handler, repository } = setup({
        jwtMockOptions: {
          mockVerifyRefreshToken: {
            userId: user.id.toValue(),
          },
        }
      });
      await repository.save(user);
      const command = new RefreshTokenCommand('valid-refresh-token');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    });
  });
});
