import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ErrorHandlingModule, JwtAuthModule, Id } from '@libs/nestjs-common';

// Controllers
import { RegisterUserController } from '@bc/auth/interfaces/controllers/users/register-user/register-user.controller';
import { GetUserController } from '@bc/auth/interfaces/controllers/users/get-user-by-id/get-user-by-id.controller';
import { VerifyEmailController } from '@bc/auth/interfaces/controllers/auth/email-verification/verify-email.controller';

// Command Handlers
import {
  RegisterUserCommandHandler,
  CreateEmailVerificationCommandHandler,
  VerifyEmailCommandHandler,
} from '@bc/auth/application/commands';

// Query Handlers
import { GetUserByIdQueryHandler } from '@bc/auth/application/queries';

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

// Add User-related imports
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { Email, Username, Password, UserRole, UserStatus } from '@bc/auth/domain/value-objects';
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

  it('should verify email successfully with valid email verification ID', async () => {
    // Arrange - Create user and get verification ID
    const userData = {
      email: 'verify@example.com',
      username: 'verifyuser',
      password: 'TestPassword123!',
      role: 'user',
    };

    const registerRes = await request(server).post('/users').send(userData).expect(201);
    const userId = registerRes.body.id;

    // Get verification ID (only peeking into repository for the ID)
    const verification = await emailVerificationRepository.findByUserId(new Id(userId));
    const emailVerificationId = verification!.id.toValue();
    expect(emailVerificationId).toBeDefined();

    // Act
    const res = await request(server)
      .post('/auth/verify-email')
      .send({ emailVerificationId })
      .expect(200);

    // Assert
    expect(res.body.userId).toBe(userId);

    // Verify the user is now active via API
    const authToken = authHelper.createAuthToken(adminUser);
    const updatedUserRes = await request(server)
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(updatedUserRes.body.status).toBe('active');
  });

  it('should return 404 for non-existent ID', async () => {
    // Use a properly formatted UUID that doesn't exist
    const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
    await request(server)
      .post('/auth/verify-email')
      .send({ emailVerificationId: nonExistentId })
      .expect(404);
  });

  it('should return 404 when trying to verify already verified email verification', async () => {
    // Arrange - Create and verify user
    const userData = {
      email: 'already@example.com',
      username: 'alreadyuser',
      password: 'TestPassword123!',
      role: 'user',
    };

    const registerRes = await request(server).post('/users').send(userData).expect(201);
    const userId = registerRes.body.id;

    const verification = await emailVerificationRepository.findByUserId(new Id(userId));
    const emailVerificationId = verification!.id.toValue();

    // First verification
    await request(server).post('/auth/verify-email').send({ emailVerificationId }).expect(200);

    // Act - Try to verify again - expect 400 Bad Request for already verified
    await request(server).post('/auth/verify-email').send({ emailVerificationId }).expect(400);
  });

  it('should return 400 for empty email verification ID', async () => {
    await request(server).post('/auth/verify-email').send({ emailVerificationId: '' }).expect(400);
  });

  it('should return 400 for missing email verification ID', async () => {
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

    const verification = await emailVerificationRepository.findByUserId(new Id(userId));
    expect(verification!.email.toValue()).toBe(userData.email);

    const emailVerificationId = verification!.id.toValue();
    await request(server).post('/auth/verify-email').send({ emailVerificationId }).expect(200);
  });
});
