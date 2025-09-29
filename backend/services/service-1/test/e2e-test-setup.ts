import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { configureApp } from '../src/app-config';
import { User_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import { EmailVerification_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { EMAIL_VERIFICATION_REPOSITORY } from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { Outbox_InMemory_Repository, JwtTokenService, OUTBOX_REPOSITORY } from '@libs/nestjs-common';
import type { Server } from 'http';
import { AppModule } from '../src/app.module';

export interface E2ETestSetup {
  app: INestApplication;
  server: Server;
  jwtTokenService: JwtTokenService;
}

export async function createE2ETestApp(): Promise<E2ETestSetup> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(USER_REPOSITORY)
    .useValue(new User_InMemory_Repository(false))
    .overrideProvider(EMAIL_VERIFICATION_REPOSITORY)
    .useValue(new EmailVerification_InMemory_Repository(false))
    .overrideProvider(OUTBOX_REPOSITORY)
    .useValue(new Outbox_InMemory_Repository())
    .compile();

  const app = moduleFixture.createNestApplication();

  configureApp(app);

  await app.init();

  const server = app.getHttpServer();

  const jwtTokenService = app.get(JwtTokenService);

  return { app, server, jwtTokenService };
}
