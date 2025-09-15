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
import { LoginUserController } from '@bc/auth/interfaces/controllers/auth/login-user/login-user.controller';
import { GetUsersController } from '@bc/auth/interfaces/controllers/users/get-users/get-users.controller';

// Command Handlers
import {
  RegisterUserCommandHandler,
  CreateEmailVerificationCommandHandler,
  VerifyEmailCommandHandler,
  RecordUserLoginCommandHandler,
} from '@bc/auth/application/commands';

// Query Handlers
import {
  GetUsersQueryHandler,
  GetTokensFromUserCredentialsQueryHandler,
  GetEmailVerificationByUserIdQueryHandler,
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
import { GetEmailVerificationByUserIdController } from '@bc/auth/interfaces/controllers/auth/email-verification/get-email-verification-by-user-id.controller';

describe('Complete User Authentication Flow (E2E)', () => {
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
        GetUsersController,
        GetEmailVerificationByUserIdController,
      ],
      providers: [
        // Command Handlers
        RegisterUserCommandHandler,
        CreateEmailVerificationCommandHandler,
        VerifyEmailCommandHandler,
        RecordUserLoginCommandHandler,

        // Query Handlers
        GetUsersQueryHandler,
        GetTokensFromUserCredentialsQueryHandler,
        GetEmailVerificationByUserIdQueryHandler,

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

  describe('Complete Authentication Flow', () => {
    it('should complete full user journey: register → verify email → login → get valid JWT', async () => {
      const userData = {
        email: 'testuser@example.com',
        username: 'testuser',
        password: 'SecurePassword123!',
        role: 'user',
      };

      // Step 1: Register user
      await request(server).post('/users').send(userData).expect(201);

      // Find the created user via GET request
      const getUsersRes = await request(server)
        .get('/users')
        .query({ email: userData.email })
        .expect(200);

      expect(getUsersRes.body.data).toHaveLength(1);
      const user = getUsersRes.body.data[0];

      // Step 2: Get verification token via API endpoint
      const emailVerificationRes = await request(server)
        .get(`/auth/email-verification/user/${user.id}`)
        .expect(200);
      const emailVerificationId = emailVerificationRes.body.id;
      expect(emailVerificationId).toBeDefined();

      // Step 3: Verify email
      await request(server).post('/auth/verify-email').send({ emailVerificationId }).expect(200);

      // Step 4: Login with verified account
      const loginRes = await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      // Verify login response structure - only tokens
      expect(typeof loginRes.body.accessToken).toBe('string');
      expect(typeof loginRes.body.refreshToken).toBe('string');

      // Step 5: Validate JWT token
      const token = loginRes.body.accessToken;

      // TODO: Instead of decoding, simply use the token to access a restricted endpoint
      const decodedToken = jwtTokenService.verifyAccessToken(token);
      expect(decodedToken.userId).toBe(user.id);
      expect(decodedToken.email).toBe(userData.email);
      expect(decodedToken.username).toBe(userData.username);
      expect(decodedToken.role).toBe(userData.role);
      expect(decodedToken.iat).toBeDefined();
      expect(decodedToken.exp).toBeDefined();

      // Verify token expiration is in the future
      const currentTimestamp = Math.floor(Date.now() / 1000);
      expect(decodedToken.exp).toBeGreaterThan(currentTimestamp);
    });

    it('should not allow login with unverified email', async () => {
      const userData = {
        email: 'unverified@example.com',
        username: 'unverified',
        password: 'TestPassword123!',
        role: 'user',
      };

      // Register user but don't verify email
      await request(server).post('/users').send(userData).expect(201);

      // Attempt to login should fail
      await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(401);
    });

    it('should not allow login with invalid credentials', async () => {
      const userData = {
        email: 'validuser@example.com',
        username: 'validuser',
        password: 'CorrectPassword123!',
        role: 'user',
      };

      // Complete registration and verification flow
      await request(server).post('/users').send(userData).expect(201);

      // Find the created user via GET request
      const getUsersRes = await request(server)
        .get('/users')
        .query({ email: userData.email })
        .expect(200);

      const userId = getUsersRes.body.data[0].id;

      const emailVerificationRes = await request(server)
        .get(`/auth/email-verification/user/${userId}`)
        .expect(200);
      const emailVerificationId = emailVerificationRes.body.id;

      await request(server).post('/auth/verify-email').send({ emailVerificationId }).expect(200);

      // Try login with wrong password
      await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Try login with wrong email
      await request(server)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: userData.password,
        })
        .expect(401);
    });

    it('should handle login validation errors correctly', async () => {
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
});
