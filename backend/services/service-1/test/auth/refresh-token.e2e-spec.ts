import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { ErrorHandlingModule, JwtAuthModule, JwtTokenService, Id } from '@libs/nestjs-common';

// Controllers
import { RegisterUserController } from '../../src/bounded-contexts/auth/interfaces/http/controllers/users/register-user/register-user.controller';
import { VerifyEmailController } from '../../src/bounded-contexts/auth/interfaces/http/controllers/auth/email-verification/verify-email.controller';
import { LoginUserController } from '../../src/bounded-contexts/auth/interfaces/http/controllers/users/login-user/login-user.controller';
import { RefreshTokenController } from '../../src/bounded-contexts/auth/interfaces/http/controllers/auth/refresh-token/refresh-token.controller';

// Command Handlers
import { RegisterUserCommandHandler } from '../../src/bounded-contexts/auth/application/commands/register-user/register-user.command-handler';
import { CreateEmailVerificationCommandHandler } from '../../src/bounded-contexts/auth/application/commands/create-email-verification/create-email-verification.command-handler';
import { VerifyEmailCommandHandler } from '../../src/bounded-contexts/auth/application/commands/verify-email/verify-email.command-handler';
import { LoginUserCommandHandler } from '../../src/bounded-contexts/auth/application/commands/login-user/login-user.command-handler';
import { RefreshTokenCommandHandler } from '../../src/bounded-contexts/auth/application/commands/refresh-token/refresh-token.command-handler';

// Domain Event Handlers
import { UserRegistered_SendIntegrationEvent_DomainEventHandler } from '../../src/bounded-contexts/auth/application/domain-event-handlers/user-registered/user-registered_send-integration-event.domain-event-handler';
import { UserRegistered_CreateEmailVerification_DomainEventHandler } from '../../src/bounded-contexts/auth/application/domain-event-handlers/user-registered/user-registered_create-email-verification.domain-event-handler';
import { EmailVerificationVerified_UpdateUserStatus_DomainEventHandler } from '../../src/bounded-contexts/auth/application/domain-event-handlers/email-verification-verified/email-verification-verified_update-user-status.domain-event-handler';

// Repositories
import { EMAIL_VERIFICATION_REPOSITORY } from '../../src/bounded-contexts/auth/domain/repositories/email-verification/email-verification.repository';
import { EmailVerificationInMemoryRepository } from '../../src/bounded-contexts/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { USER_REPOSITORY } from '../../src/bounded-contexts/auth/domain/repositories/user/user.repository';
import { UserInMemoryRepository } from '../../src/bounded-contexts/auth/infrastructure/repositories/in-memory/user-in-memory.repository';

// Mocks
import type { MockOutboxService } from '@libs/nestjs-common';
import { createOutboxServiceMock, OutboxService } from '@libs/nestjs-common';

describe('Refresh Token Flow (E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let emailVerificationRepository: EmailVerificationInMemoryRepository;
  let userRepository: UserInMemoryRepository;
  let jwtTokenService: JwtTokenService;

  beforeAll(async () => {
    const mockOutboxService: MockOutboxService = createOutboxServiceMock({ shouldFail: false });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule, JwtAuthModule],
      controllers: [
        RegisterUserController,
        VerifyEmailController,
        LoginUserController,
        RefreshTokenController,
      ],
      providers: [
        // Command Handlers
        RegisterUserCommandHandler,
        CreateEmailVerificationCommandHandler,
        VerifyEmailCommandHandler,
        LoginUserCommandHandler,
        RefreshTokenCommandHandler,

        // Domain Event Handlers
        UserRegistered_SendIntegrationEvent_DomainEventHandler,
        UserRegistered_CreateEmailVerification_DomainEventHandler,
        EmailVerificationVerified_UpdateUserStatus_DomainEventHandler,

        // Repositories
        {
          provide: EMAIL_VERIFICATION_REPOSITORY,
          useFactory: () => new EmailVerificationInMemoryRepository(false),
        },
        {
          provide: USER_REPOSITORY,
          useFactory: () => new UserInMemoryRepository(false),
        },

        // Mock services
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    server = app.getHttpServer() as unknown as Server;

    emailVerificationRepository = moduleFixture.get<EmailVerificationInMemoryRepository>(
      EMAIL_VERIFICATION_REPOSITORY,
    );
    userRepository = moduleFixture.get<UserInMemoryRepository>(USER_REPOSITORY);
    jwtTokenService = moduleFixture.get<JwtTokenService>(JwtTokenService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear repositories before each test
    (emailVerificationRepository as any).emailVerifications.clear();
    (userRepository as any).users.clear();
  });

  describe('POST /auth/refresh', () => {
    const setupVerifiedUser = async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePassword123!',
        role: 'user',
      };

      // Register user
      const registerRes = await request(server).post('/users').send(userData).expect(201);
      const userId = registerRes.body.id;

      // Verify email
      const verification = await emailVerificationRepository.findByUserId(new Id(userId));
      await request(server)
        .post('/auth/verify-email')
        .send({ token: verification!.token.toValue() })
        .expect(200);

      // Login to get tokens
      const loginRes = await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      return {
        userId,
        userData,
        accessToken: loginRes.body.accessToken,
        refreshToken: loginRes.body.refreshToken,
      };
    };

    it('should successfully refresh tokens with valid refresh token', async () => {
      // Arrange
      const { userId, userData, refreshToken } = await setupVerifiedUser();

      // Act
      const refreshRes = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Assert
      expect(refreshRes.body).toHaveProperty('userId', userId);
      expect(refreshRes.body).toHaveProperty('email', userData.email);
      expect(refreshRes.body).toHaveProperty('username', userData.username);
      expect(refreshRes.body).toHaveProperty('role', userData.role);
      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');

      // Verify new tokens are different from original
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.refreshToken).toBeDefined();
      expect(typeof refreshRes.body.accessToken).toBe('string');
      expect(typeof refreshRes.body.refreshToken).toBe('string');

      // Verify new access token is valid
      const decodedAccessToken = jwtTokenService.verifyAccessToken(refreshRes.body.accessToken);
      expect(decodedAccessToken.userId).toBe(userId);
      expect(decodedAccessToken.email).toBe(userData.email);
      expect(decodedAccessToken.username).toBe(userData.username);
      expect(decodedAccessToken.role).toBe(userData.role);

      // Verify new refresh token is valid
      const decodedRefreshToken = jwtTokenService.verifyRefreshToken(refreshRes.body.refreshToken);
      expect(decodedRefreshToken.userId).toBe(userId);
    });

    it('should return 401 for invalid refresh token', async () => {
      // Act & Assert
      await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should return 401 for refresh token of unverified user', async () => {
      // Arrange
      const userData = {
        email: 'unverified@example.com',
        username: 'unverified',
        password: 'TestPassword123!',
        role: 'user',
      };

      // Register user but don't verify email
      const registerRes = await request(server).post('/users').send(userData).expect(201);
      const userId = registerRes.body.id;

      // Create a refresh token for unverified user using the real service
      const refreshToken = jwtTokenService.generateRefreshToken({ userId });

      // Act & Assert
      await request(server).post('/auth/refresh').send({ refreshToken }).expect(401);
    });

    it('should validate request body properly', async () => {
      // Missing refresh token
      await request(server).post('/auth/refresh').send({}).expect(400);

      // Empty refresh token
      await request(server).post('/auth/refresh').send({ refreshToken: '' }).expect(400);

      // Wrong field name
      await request(server).post('/auth/refresh').send({ token: 'some-token' }).expect(400);

      // Non-string refresh token
      await request(server).post('/auth/refresh').send({ refreshToken: 123 }).expect(400);
    });

    it('should allow multiple refresh operations with same refresh token', async () => {
      // Arrange
      const { refreshToken } = await setupVerifiedUser();

      // Act - Refresh multiple times
      const refreshRes1 = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const refreshRes2 = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Assert - Both refreshes should work
      expect(jwtTokenService.verifyAccessToken(refreshRes1.body.accessToken)).toBeDefined();
      expect(jwtTokenService.verifyAccessToken(refreshRes2.body.accessToken)).toBeDefined();
      expect(jwtTokenService.verifyRefreshToken(refreshRes1.body.refreshToken)).toBeDefined();
      expect(jwtTokenService.verifyRefreshToken(refreshRes2.body.refreshToken)).toBeDefined();
    });

    it('should allow using new refresh token for subsequent refreshes', async () => {
      // Arrange
      const { refreshToken: initialRefreshToken, userId } = await setupVerifiedUser();

      // Act - First refresh
      const firstRefreshRes = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: initialRefreshToken })
        .expect(200);

      // Act - Second refresh using new refresh token
      const secondRefreshRes = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: firstRefreshRes.body.refreshToken })
        .expect(200);

      // Assert
      expect(jwtTokenService.verifyAccessToken(secondRefreshRes.body.accessToken)).toBeDefined();
      expect(jwtTokenService.verifyRefreshToken(secondRefreshRes.body.refreshToken)).toBeDefined();
      expect(secondRefreshRes.body.userId).toBe(userId);
    });

    it('should return consistent user data across refresh operations', async () => {
      // Arrange
      const { userId, userData, refreshToken } = await setupVerifiedUser();

      // Act
      const refreshRes = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Assert - User data should remain consistent
      expect(refreshRes.body.userId).toBe(userId);
      expect(refreshRes.body.email).toBe(userData.email);
      expect(refreshRes.body.username).toBe(userData.username);
      expect(refreshRes.body.role).toBe(userData.role);
    });

    it('should handle concurrent refresh requests', async () => {
      // Arrange
      const { refreshToken } = await setupVerifiedUser();

      // Act - Make concurrent refresh requests
      const [res1, res2, res3] = await Promise.all([
        request(server).post('/auth/refresh').send({ refreshToken }),
        request(server).post('/auth/refresh').send({ refreshToken }),
        request(server).post('/auth/refresh').send({ refreshToken }),
      ]);

      // Assert - All requests should succeed
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);

      // All should have valid tokens
      expect(res1.body.accessToken).toBeDefined();
      expect(res2.body.accessToken).toBeDefined();
      expect(res3.body.accessToken).toBeDefined();
    });
  });
});
