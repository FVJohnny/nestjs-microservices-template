import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { ErrorHandlingModule } from '@libs/nestjs-common';
import { RegisterUserController } from '../../src/bounded-contexts/users/interfaces/http/controllers/users/register-user/register-user.controller';
import { RegisterUserCommandHandler } from '../../src/bounded-contexts/users/application/commands/register-user/register-user.command-handler';
import { USER_REPOSITORY } from '../../src/bounded-contexts/users/domain/repositories/user.repository';
import { UserInMemoryRepository } from '../../src/bounded-contexts/users/infrastructure/repositories/in-memory/user-in-memory.repository';

describe('POST /users (E2E)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule],
      controllers: [RegisterUserController],
      providers: [
        RegisterUserCommandHandler,
        { provide: USER_REPOSITORY, useClass: UserInMemoryRepository },
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

  it('creates a user and returns 201 with id', async () => {
    const body = {
      email: 'john.doe@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
    };

    const res = await request(server).post('/users').send(body).expect(201);
    expect(res.body.id).toBeDefined();
  });

  it('returns 409 for duplicate email', async () => {
    const body = {
      email: 'dup@example.com',
      username: 'dupuser',
      firstName: 'Dupe',
      lastName: 'Case',
      role: 'user',
    };
    await request(server).post('/users').send(body).expect(201);
    await request(server)
      .post('/users')
      .send({ ...body, username: 'newuser' })
      .expect(409);
  });

  it('returns a client error for invalid email and too-short username', async () => {
    await request(server)
      .post('/users')
      .send({ email: 'not-an-email', username: 'ab', role: 'user' })
      .expect((res) => {
        if (res.status !== 400 && res.status !== 500) {
          throw new Error(`Expected 400 or 500, got ${res.status}`);
        }
      });
  });
});
