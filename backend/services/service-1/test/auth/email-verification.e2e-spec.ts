import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ErrorHandlingModule, JwtAuthModule } from '@libs/nestjs-common';

// Controllers
import { RegisterUserController } from '../../src/bounded-contexts/auth/interfaces/http/controllers/users/register-user/register-user.controller';
import { GetUserController } from '../../src/bounded-contexts/auth/interfaces/http/controllers/users/get-user-by-id/get-user-by-id.controller';
import { VerifyEmailController } from '../../src/bounded-contexts/auth/interfaces/http/controllers/auth/email-verification/verify-email.controller';

// Command Handlers
import { RegisterUserCommandHandler } from '../../src/bounded-contexts/auth/application/commands/register-user/register-user.command-handler';
import { CreateEmailVerificationCommandHandler } from '../../src/bounded-contexts/auth/application/commands/create-email-verification/create-email-verification.command-handler';
import { VerifyEmailCommandHandler } from '../../src/bounded-contexts/auth/application/commands/verify-email/verify-email.command-handler';

// Query Handlers
import { GetUserByIdQueryHandler } from '../../src/bounded-contexts/auth/application/queries/get-user-by-id/get-user-by-id.query-handler';

// Domain Event Handlers
import { UserRegisteredDomainEventHandler } from '../../src/bounded-contexts/auth/application/domain-event-handlers/user-registered/user-registered.domain-event-handler';
import { EmailVerifiedDomainEventHandler } from '../../src/bounded-contexts/auth/application/domain-event-handlers/email-verified/email-verified.domain-event-handler';

// Repositories
import { EMAIL_VERIFICATION_REPOSITORY } from '../../src/bounded-contexts/auth/domain/repositories/email-verification/email-verification.repository';
import { EmailVerificationInMemoryRepository } from '../../src/bounded-contexts/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { USER_REPOSITORY } from '../../src/bounded-contexts/auth/domain/repositories/user/user.repository';
import { UserInMemoryRepository } from '../../src/bounded-contexts/auth/infrastructure/repositories/in-memory/user-in-memory.repository';

// Mocks
import type { MockOutboxService } from '@libs/nestjs-common';
import { createOutboxServiceMock, OutboxService } from '@libs/nestjs-common';

// Add User-related imports
import { User } from '../../src/bounded-contexts/auth/domain/entities/user/user.entity';
import {
  Email,
  Username,
  Password,
  UserRole,
  UserStatus,
} from '../../src/bounded-contexts/auth/domain/value-objects';
import { AuthTestHelper } from '../utils/auth-test.helper';

describe('Email Verification (E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let emailVerificationRepository: EmailVerificationInMemoryRepository;
  let userRepository: UserInMemoryRepository;
  let authHelper: AuthTestHelper;
  let adminUser: User;

  beforeAll(async () => {
    const mockOutboxService: MockOutboxService = createOutboxServiceMock({ shouldFail: false });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule, JwtAuthModule],
      controllers: [RegisterUserController, GetUserController, VerifyEmailController],
      providers: [
        // Command Handlers
        RegisterUserCommandHandler,
        CreateEmailVerificationCommandHandler,
        VerifyEmailCommandHandler,

        // Query Handlers
        GetUserByIdQueryHandler,

        // Domain Event Handlers
        UserRegisteredDomainEventHandler,
        EmailVerifiedDomainEventHandler,

        // Repositories
        {
          provide: EMAIL_VERIFICATION_REPOSITORY,
          useFactory: () => new EmailVerificationInMemoryRepository(false),
        },
        {
          provide: USER_REPOSITORY,
          useFactory: () => new UserInMemoryRepository(false),
        },

        // Mock services for domain event handlers
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

    // Initialize auth helper and create admin user
    const jwtService = moduleFixture.get<JwtService>(JwtService);
    authHelper = new AuthTestHelper(jwtService);

    // Create an admin user for authentication in tests
    adminUser = User.random({
      email: new Email('admin@test.com'),
      username: new Username('testadmin'),
      password: Password.createFromPlainTextSync('AdminPassword123!'),
      role: UserRole.admin(),
      status: UserStatus.active(),
    });
    await userRepository.save(adminUser);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear repositories before each test
    (emailVerificationRepository as any).emailVerifications.clear();
    (userRepository as any).users.clear();
  });

  it('should create user with email verification pending status', async () => {
    const body = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'TestPassword123!',
      role: 'user',
    };

    const registerRes = await request(server).post('/users').send(body).expect(201);
    const userId = registerRes.body.id;
    expect(userId).toBeDefined();

    // Check user status via API (using admin auth)
    const authToken = authHelper.createAuthToken(adminUser);
    const userRes = await request(server)
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(userRes.body.status).toBe('email-verification-pending');
    expect(userRes.body.email).toBe(body.email);
  });

  it('should verify email successfully with valid token', async () => {
    // Arrange - Create user and get verification token
    const userData = {
      email: 'verify@example.com',
      username: 'verifyuser',
      password: 'TestPassword123!',
      role: 'user',
    };

    const registerRes = await request(server).post('/users').send(userData).expect(201);
    const userId = registerRes.body.id;

    // Get verification token (only peeking into repository for the token)
    const verification = await emailVerificationRepository.findByUserId(userId);
    const token = verification!.token;
    expect(token).toBeDefined();

    // Act
    const res = await request(server).post('/auth/verify-email').send({ token }).expect(200);

    // Assert
    expect(res.body.success).toBe(true);
    expect(res.body.userId).toBe(userId);

    // Verify the user is now active via API
    const authToken = authHelper.createAuthToken(adminUser);
    const updatedUserRes = await request(server)
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(updatedUserRes.body.status).toBe('active');
  });

  it('should return 404 for non-existent token', async () => {
    await request(server)
      .post('/auth/verify-email')
      .send({ token: 'non-existent-token' })
      .expect(404);
  });

  it('should return 404 when trying to verify already verified token', async () => {
    // Arrange - Create and verify user
    const userData = {
      email: 'already@example.com',
      username: 'alreadyuser',
      password: 'TestPassword123!',
      role: 'user',
    };

    const registerRes = await request(server).post('/users').send(userData).expect(201);
    const userId = registerRes.body.id;

    const verification = await emailVerificationRepository.findByUserId(userId);
    const token = verification!.token;

    // First verification
    await request(server).post('/auth/verify-email').send({ token }).expect(200);

    // Act - Try to verify again
    await request(server).post('/auth/verify-email').send({ token }).expect(404);
  });

  it('should return 400 for empty token', async () => {
    await request(server).post('/auth/verify-email').send({ token: '' }).expect(400);
  });

  it('should return 400 for missing token', async () => {
    await request(server).post('/auth/verify-email').send({}).expect(400);
  });

  it('should handle special characters in email addresses', async () => {
    const userData = {
      email: 'test.user+tag@sub-domain.example.com',
      username: 'specialuser',
      password: 'TestPassword123!',
      role: 'user',
    };

    const registerRes = await request(server).post('/users').send(userData).expect(201);
    const userId = registerRes.body.id;

    const verification = await emailVerificationRepository.findByUserId(userId);
    expect(verification!.email.toValue()).toBe(userData.email);

    const token = verification!.token;
    await request(server).post('/auth/verify-email').send({ token }).expect(200);
  });
});
