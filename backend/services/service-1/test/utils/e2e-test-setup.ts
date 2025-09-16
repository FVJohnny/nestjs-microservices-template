import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthBoundedContextModule } from '../../src/bounded-contexts/auth/auth.module';
import { JwtAuthModule, OutboxModule, ErrorHandlingModule } from '@libs/nestjs-common';
import { configureApp } from '../../src/app-config';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import type { UserRepository } from '@bc/auth/domain/repositories/user/user.repository';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import { EmailVerificationInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import type { EmailVerificationRepository } from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { EMAIL_VERIFICATION_REPOSITORY } from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { InMemoryOutboxRepository } from '@libs/nestjs-common';
import type { Server } from 'http';
import { RedisIntegrationEventsModule } from '@libs/nestjs-redis';

export interface E2ETestSetup {
  app: INestApplication;
  server: Server;
  userRepository: UserRepository;
  emailVerificationRepository: EmailVerificationRepository;
  clearRepositories: () => Promise<void>;
  cleanup: () => Promise<void>;
}

export async function createE2ETestApp(): Promise<E2ETestSetup> {
  // Create fresh repository instances for each test suite
  const userRepository = new UserInMemoryRepository(false);
  const emailVerificationRepository = new EmailVerificationInMemoryRepository(false);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      CqrsModule.forRoot(),
      ErrorHandlingModule,
      JwtAuthModule,
      RedisIntegrationEventsModule,
      OutboxModule.forRoot({ repository: InMemoryOutboxRepository }),
      AuthBoundedContextModule,
    ],
  })
    .overrideProvider(USER_REPOSITORY)
    .useValue(userRepository)
    .overrideProvider(EMAIL_VERIFICATION_REPOSITORY)
    .useValue(emailVerificationRepository)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply shared configuration but disable production-only features for tests
  configureApp(app);

  await app.init();

  const server = app.getHttpServer();

  const clearRepositories = async () => {
    await userRepository.clear();
    await emailVerificationRepository.clear();
  };

  const cleanup = async () => {
    await clearRepositories();
    await app.close();
  };

  return { app, server, userRepository, emailVerificationRepository, clearRepositories, cleanup };
}
