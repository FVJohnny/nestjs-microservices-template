import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { ErrorHandlingModule } from '@libs/nestjs-common';
import { RegisterUserController } from '@bc/auth/interfaces/controllers/users/register-user/register-user.controller';
import { RegisterUserCommandHandler } from '@bc/auth/application/commands';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';

describe('POST /users (E2E)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule],
      controllers: [RegisterUserController],
      providers: [
        RegisterUserCommandHandler,
        { provide: USER_REPOSITORY, useFactory: () => new UserInMemoryRepository(false) },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    server = app.getHttpServer() as unknown as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a user and returns 201', async () => {
    const body = {
      email: 'john.doe@example.com',
      username: 'johndoe',
      password: 'TestPassword123!',
      role: 'user',
    };

    await request(server).post('/users').send(body).expect(201);
  });

  it('returns 409 for duplicate email', async () => {
    const body = {
      email: 'dup@example.com',
      username: 'dupuser',
      password: 'TestPassword123!',
      role: 'user',
    };
    await request(server).post('/users').send(body).expect(201);
    await request(server)
      .post('/users')
      .send({ ...body, username: 'newuser' })
      .expect(409);
  });

  it('returns 422 error for invalid email', async () => {
    await request(server)
      .post('/users')
      .send({
        email: 'not-an-email',
        username: 'normal-username',
        password: 'TestPassword123!',
        role: 'user',
      })
      .expect(422);
  });

  it('returns 422 error for too short username', async () => {
    await request(server)
      .post('/users')
      .send({
        email: 'normal-user@example.com',
        username: 'ab',
        password: 'TestPassword123!',
        role: 'invalid',
      })
      .expect(422);
  });

  it('returns 422 error for too short password', async () => {
    await request(server)
      .post('/users')
      .send({
        email: 'normal-user@example.com',
        username: 'normal-user',
        password: 'ab',
        role: 'user',
      })
      .expect(422);
  });

  it('returns 422 error for invalid role', async () => {
    await request(server)
      .post('/users')
      .send({
        email: 'normal-user@example.com',
        username: 'normal-username',
        password: 'TestPassword123!',
        role: 'invalid',
      })
      .expect(422);
  });
});
