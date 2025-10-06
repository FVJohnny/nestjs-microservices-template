import { EMAIL_VERIFICATION_REPOSITORY } from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { PASSWORD_RESET_REPOSITORY } from '@bc/auth/domain/repositories/password-reset/password-reset.repository';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import { USER_TOKEN_REPOSITORY } from '@libs/nestjs-common';
import { EmailVerification_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { PasswordReset_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/password-reset-in-memory.repository';
import { User_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { UserToken_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/user-token-in-memory.repository';
import {
  InMemoryIntegrationEventsModule,
  Outbox_InMemory_Repository,
  OUTBOX_REPOSITORY,
} from '@libs/nestjs-common';
import { KafkaIntegrationEventsModule } from '@libs/nestjs-kafka';
import { MongoDBModule } from '@libs/nestjs-mongodb';
import { RedisDBModule } from '@libs/nestjs-redis';
import type { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import TestAgent from 'supertest/lib/agent';
import { configureApp } from '../src/app-config';
import { AppModule } from '../src/app.module';

@Module({})
class DummyModule {}

export interface E2ETestSetup {
  app: INestApplication;
  agent: TestAgent;
}

export async function createE2ETestApp(
  options: { bypassRateLimit?: boolean } = {},
): Promise<E2ETestSetup> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(KafkaIntegrationEventsModule)
    .useModule(InMemoryIntegrationEventsModule)
    .overrideModule(MongoDBModule)
    .useModule(DummyModule)
    .overrideModule(RedisDBModule)
    .useModule(DummyModule)
    .overrideProvider(USER_REPOSITORY)
    .useValue(new User_InMemory_Repository(false))
    .overrideProvider(EMAIL_VERIFICATION_REPOSITORY)
    .useValue(new EmailVerification_InMemory_Repository(false))
    .overrideProvider(PASSWORD_RESET_REPOSITORY)
    .useValue(new PasswordReset_InMemory_Repository(false))
    .overrideProvider(USER_TOKEN_REPOSITORY)
    .useValue(new UserToken_InMemory_Repository(false))
    .overrideProvider(OUTBOX_REPOSITORY)
    .useValue(new Outbox_InMemory_Repository())
    .compile();

  const app = moduleFixture.createNestApplication();

  if (options.bypassRateLimit) {
    setupRandomIPMiddleware(app);
  }

  configureApp(app);

  await app.init();

  const server = app.getHttpServer();

  const agent = request(server);

  return { agent, app };
}

function setupRandomIPMiddleware(app: INestApplication): void {
  // Add middleware to set random IP for each request to bypass rate limiting
  app.use((req: any, _res: any, next: any) => {
    const randomIP = generateRandomIP();
    // Override connection properties
    Object.defineProperty(req, 'ip', {
      value: randomIP,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(req, 'ips', {
      value: [randomIP],
      writable: true,
      configurable: true,
    });
    // Set headers that throttler might check
    req.headers['x-forwarded-for'] = randomIP;
    req.headers['x-real-ip'] = randomIP;
    req.headers['cf-connecting-ip'] = randomIP;
    next();
  });
}

function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}
