import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { ErrorHandlingModule, JwtAuthModule, JwtTokenService, Id } from '@libs/nestjs-common';

// Controllers
import { RegisterUserController } from '@bc/auth/interfaces/controllers/users/register-user/register-user.controller';
import { VerifyEmailController } from '@bc/auth/interfaces/controllers/auth/email-verification/verify-email.controller';
import { LoginUserController } from '@bc/auth/interfaces/controllers/users/login-user/login-user.controller';

// Command Handlers
import {
  RegisterUserCommandHandler,
  CreateEmailVerificationCommandHandler,
  VerifyEmailCommandHandler,
  LoginUserCommandHandler,
} from '@bc/auth/application/commands';

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
      controllers: [RegisterUserController, VerifyEmailController, LoginUserController],
      providers: [
        // Command Handlers
        RegisterUserCommandHandler,
        CreateEmailVerificationCommandHandler,
        VerifyEmailCommandHandler,
        LoginUserCommandHandler,

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
      const registerRes = await request(server).post('/users').send(userData).expect(201);

      const userId = registerRes.body.id;
      expect(userId).toBeDefined();
      expect(typeof userId).toBe('string');

      // Step 2: Get verification token (simulate email received)
      const verification = await emailVerificationRepository.findByUserId(new Id(userId));
      expect(verification).toBeDefined();
      const verificationToken = verification!.id.toValue();

      // Step 3: Verify email
      const verifyRes = await request(server)
        .post('/auth/verify-email')
        .send({ emailVerificationId: verificationToken })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.userId).toBe(userId);

      // Step 4: Login with verified account
      const loginRes = await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      // Verify login response structure
      expect(loginRes.body.userId).toBe(userId);
      expect(loginRes.body.email).toBe(userData.email);
      expect(loginRes.body.username).toBe(userData.username);
      expect(loginRes.body.role).toBe(userData.role);
      expect(typeof loginRes.body.accessToken).toBe('string');
      expect(typeof loginRes.body.refreshToken).toBe('string');

      // Step 5: Validate JWT token
      const token = loginRes.body.accessToken;

      // Verify token can be decoded
      const decodedToken = jwtTokenService.verifyAccessToken(token);
      expect(decodedToken.userId).toBe(userId);
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
      const registerRes = await request(server).post('/users').send(userData).expect(201);
      const userId = registerRes.body.id;

      const verification = await emailVerificationRepository.findByUserId(new Id(userId));
      const verificationToken = verification!.id.toValue();

      await request(server)
        .post('/auth/verify-email')
        .send({ emailVerificationId: verificationToken })
        .expect(200);

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

    it('should validate JWT token contains correct payload structure', async () => {
      const userData = {
        email: 'jwt-test@example.com',
        username: 'jwttest',
        password: 'JWTTestPassword123!',
        role: 'admin',
      };

      // Complete flow to get valid JWT
      const registerRes = await request(server).post('/users').send(userData).expect(201);
      const userId = registerRes.body.id;

      const verification = await emailVerificationRepository.findByUserId(new Id(userId));
      await request(server)
        .post('/auth/verify-email')
        .send({ emailVerificationId: verification!.id.toValue() })
        .expect(200);

      const loginRes = await request(server)
        .post('/auth/login')
        .send({ email: userData.email, password: userData.password })
        .expect(200);

      const token = loginRes.body.accessToken;

      // Verify token structure and claims
      const decoded = jwtTokenService.verifyAccessToken(token);

      // Standard JWT claims
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
      expect(typeof decoded.iat).toBe('number');
      expect(typeof decoded.exp).toBe('number');

      // Custom payload
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.username).toBe(userData.username);
      expect(decoded.role).toBe(userData.role);

      // Verify token is not expired
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.iat).toBeLessThanOrEqual(now);
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
