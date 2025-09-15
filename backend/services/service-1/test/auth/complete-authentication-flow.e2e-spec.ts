import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { ErrorHandlingModule, JwtAuthModule, JwtTokenService } from '@libs/nestjs-common';

// Controllers
import { RegisterUserController } from '@bc/auth/interfaces/controllers/users/register-user/register-user.controller';
import { VerifyEmailController } from '@bc/auth/interfaces/controllers/auth/email-verification/verify-email.controller';
import { GetEmailVerificationByUserIdController } from '@bc/auth/interfaces/controllers/auth/email-verification/get-email-verification-by-user-id.controller';
import { LoginUserController } from '@bc/auth/interfaces/controllers/auth/login-user/login-user.controller';
import { RefreshTokenController } from '@bc/auth/interfaces/controllers/auth/refresh-token/refresh-token.controller';
import { GetUsersController } from '@bc/auth/interfaces/controllers/users/get-users/get-users.controller';
import { GetUserController } from '@bc/auth/interfaces/controllers/users/get-user-by-id/get-user-by-id.controller';

// Command Handlers
import {
  RegisterUserCommandHandler,
  CreateEmailVerificationCommandHandler,
  VerifyEmailCommandHandler,
  RecordUserLoginCommandHandler,
} from '@bc/auth/application/commands';

// Query Handlers
import {
  GetTokensFromRefreshTokenQueryHandler,
  GetUsersQueryHandler,
  GetTokensFromUserCredentialsQueryHandler,
  GetEmailVerificationByUserIdQueryHandler,
  GetUserByIdQueryHandler,
} from '@bc/auth/application/queries';

// Domain Event Handlers
import {
  UserRegistered_SendIntegrationEvent_DomainEventHandler,
  UserRegistered_CreateEmailVerification_DomainEventHandler,
  EmailVerificationVerified_UpdateUserStatus_DomainEventHandler,
} from '@bc/auth/application/domain-event-handlers';

// Repositories
import { EMAIL_VERIFICATION_REPOSITORY } from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { EmailVerificationInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';

// Mocks
import type { MockOutboxService } from '@libs/nestjs-common';
import { createOutboxServiceMock, OutboxService } from '@libs/nestjs-common';

describe('Complete Authentication Flow (E2E)', () => {
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
        GetEmailVerificationByUserIdController,
        LoginUserController,
        RefreshTokenController,
        GetUsersController,
        GetUserController,
      ],
      providers: [
        // Command Handlers
        RegisterUserCommandHandler,
        CreateEmailVerificationCommandHandler,
        VerifyEmailCommandHandler,
        RecordUserLoginCommandHandler,

        // Query Handlers
        GetTokensFromRefreshTokenQueryHandler,
        GetUsersQueryHandler,
        GetTokensFromUserCredentialsQueryHandler,
        GetEmailVerificationByUserIdQueryHandler,
        GetUserByIdQueryHandler,

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

        // Mocks
        { provide: OutboxService, useValue: mockOutboxService },
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

  describe('Complete Happy Path Flow', () => {
    it('should complete full authentication journey: register → verify → login → refresh', async () => {
      const userData = {
        email: 'complete@example.com',
        username: 'completeuser',
        password: 'CompletePassword123!',
        role: 'user',
      };

      // Step 1: Register User
      await request(server).post('/users').send(userData).expect(201);

      // Get the created user
      const getUsersRes = await request(server)
        .get('/users')
        .query({ email: userData.email })
        .expect(200);
      expect(getUsersRes.body.data).toHaveLength(1);
      const user = getUsersRes.body.data[0];

      // Step 2: Get Email Verification via API
      const emailVerificationRes = await request(server)
        .get(`/auth/email-verification/user/${user.id}`)
        .expect(200);
      const emailVerificationId = emailVerificationRes.body.id;
      expect(emailVerificationId).toBeDefined();
      expect(emailVerificationRes.body.userId).toBe(user.id);
      expect(emailVerificationRes.body.email).toBe(userData.email);

      // Step 3: Verify Email
      await request(server).post('/auth/verify-email').send({ emailVerificationId }).expect(200);

      // Verify user status changed to active
      const updatedUserRes = await request(server).get(`/users/${user.id}`).expect(200);
      expect(updatedUserRes.body.status).toBe('active');

      // Step 4: Login with Verified Account
      const loginRes = await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      // Verify login response structure
      expect(typeof loginRes.body.accessToken).toBe('string');
      expect(typeof loginRes.body.refreshToken).toBe('string');

      // Validate JWT token structure
      const accessToken = loginRes.body.accessToken;
      const decodedToken = jwtTokenService.verifyAccessToken(accessToken);
      expect(decodedToken.userId).toBe(user.id);
      expect(decodedToken.email).toBe(userData.email);
      expect(decodedToken.username).toBe(userData.username);
      expect(decodedToken.role).toBe(userData.role);

      // Step 5: Refresh Token
      const refreshToken = loginRes.body.refreshToken;
      const refreshRes = await request(server)
        .post('/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      // Verify refresh response
      expect(typeof refreshRes.body.accessToken).toBe('string');
      expect(typeof refreshRes.body.refreshToken).toBe('string');

      // Verify new tokens are different from original
      expect(refreshRes.body.accessToken).not.toBe(accessToken);
      expect(refreshRes.body.refreshToken).not.toBe(refreshToken);

      // Validate new access token
      const newAccessToken = refreshRes.body.accessToken;
      const newDecodedToken = jwtTokenService.verifyAccessToken(newAccessToken);
      expect(newDecodedToken.userId).toBe(user.id);
      expect(newDecodedToken.email).toBe(userData.email);
      expect(newDecodedToken.username).toBe(userData.username);
      expect(newDecodedToken.role).toBe(userData.role);
    });
  });

  describe('Registration Error Cases', () => {
    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'Password123!',
        role: 'user',
      };

      // First registration should succeed
      await request(server).post('/users').send(userData).expect(201);

      // Second registration with same email should fail
      await request(server)
        .post('/users')
        .send({ ...userData, username: 'user2' })
        .expect(409);
    });

    it('should validate user input properly', async () => {
      // Invalid email format
      await request(server)
        .post('/users')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'ValidPassword123!',
          role: 'user',
        })
        .expect(422);

      // Missing required fields
      await request(server).post('/users').send({}).expect(400);
    });
  });

  describe('Email Verification Error Cases', () => {
    it('should return 404 for non-existent verification ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
      await request(server)
        .post('/auth/verify-email')
        .send({ emailVerificationId: nonExistentId })
        .expect(404);
    });

    it('should return 404 for non-existent verification with specified user ID', async () => {
      const nonExistentUserId = '123e4567-e89b-12d3-a456-426614174999';
      await request(server).get(`/auth/email-verification/user/${nonExistentUserId}`).expect(404);
    });

    it('should prevent double email verification', async () => {
      const userData = {
        email: 'double@example.com',
        username: 'doubleuser',
        password: 'Password123!',
        role: 'user',
      };

      // Register user
      await request(server).post('/users').send(userData).expect(201);

      // Get user
      const getUsersRes = await request(server)
        .get('/users')
        .query({ email: userData.email })
        .expect(200);
      const userId = getUsersRes.body.data[0].id;

      // Get verification
      const verificationRes = await request(server)
        .get(`/auth/email-verification/user/${userId}`)
        .expect(200);
      const emailVerificationId = verificationRes.body.id;

      // First verification should succeed. Second verification should fail.
      await request(server).post('/auth/verify-email').send({ emailVerificationId }).expect(200);
      await request(server).post('/auth/verify-email').send({ emailVerificationId }).expect(400);
    });
  });

  describe('Login Error Cases', () => {
    it('should reject login with unverified email', async () => {
      const userData = {
        email: 'unverified@example.com',
        username: 'unverifieduser',
        password: 'Password123!',
        role: 'user',
      };

      // Register user but don't verify email
      await request(server).post('/users').send(userData).expect(201);

      // Login should fail
      await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(401);
    });

    it('should reject login with wrong credentials', async () => {
      const userData = {
        email: 'wrongcreds@example.com',
        username: 'wrongcredsuser',
        password: 'CorrectPassword123!',
        role: 'user',
      };

      // Complete registration and verification
      await request(server).post('/users').send(userData).expect(201);

      const getUsersRes = await request(server)
        .get('/users')
        .query({ email: userData.email })
        .expect(200);
      const userId = getUsersRes.body.data[0].id;

      const verificationRes = await request(server)
        .get(`/auth/email-verification/user/${userId}`)
        .expect(200);
      const emailVerificationId = verificationRes.body.id;

      await request(server).post('/auth/verify-email').send({ emailVerificationId }).expect(200);

      // Wrong password
      await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Wrong email
      await request(server)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: userData.password,
        })
        .expect(401);
    });

    it('should validate login input properly', async () => {
      // Invalid email format
      await request(server)
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: 'ValidPassword123!',
        })
        .expect(422);

      // Missing password
      await request(server)
        .post('/auth/login')
        .send({
          email: 'valid@example.com',
        })
        .expect(400);
    });
  });

  describe('Token Refresh Error Cases', () => {
    it('should reject invalid refresh tokens', async () => {
      // Invalid refresh token format
      await request(server)
        .post('/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      // Missing refresh token
      await request(server).post('/auth/refresh-token').send({}).expect(400);
    });
  });
});
