import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { configureApp } from '../src/app-config';
import { User_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import { EmailVerification_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { EMAIL_VERIFICATION_REPOSITORY } from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { InMemoryOutboxRepository, OUTBOX_REPOSITORY } from '@libs/nestjs-common';
import type { Server } from 'http';
import { AppModule } from '../src/app.module';

export interface E2ETestSetup {
  app: INestApplication;
  server: Server;
}

export async function createE2ETestApp(): Promise<E2ETestSetup> {
  // Create fresh repository instances for each test suite
  const userRepository = new User_InMemory_Repository(false);
  const emailVerificationRepository = new EmailVerification_InMemory_Repository(false);
  const outboxRepository = new InMemoryOutboxRepository();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(USER_REPOSITORY)
    .useValue(userRepository)
    .overrideProvider(EMAIL_VERIFICATION_REPOSITORY)
    .useValue(emailVerificationRepository)
    .overrideProvider(OUTBOX_REPOSITORY)
    .useValue(outboxRepository)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply shared configuration but disable production-only features for tests
  configureApp(app);

  await app.init();

  const server = app.getHttpServer();

  return { app, server };
}
