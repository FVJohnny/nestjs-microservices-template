import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { ErrorHandlingModule } from '@libs/nestjs-common';
import { GetUserController } from '@bc/auth/interfaces/controllers/users/get-user-by-id/get-user-by-id.controller';
import { RegisterUserController } from '@bc/auth/interfaces/controllers/users/register-user/register-user.controller';
import { GetUsersController } from '@bc/auth/interfaces/controllers/users/get-users/get-users.controller';
import { GetUserByIdQueryHandler, GetUsersQueryHandler } from '@bc/auth/application/queries';
import { RegisterUserCommandHandler } from '@bc/auth/application/commands';
import type { UserRepository } from '@bc/auth/domain/repositories/user/user.repository';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { v4 as uuid } from 'uuid';

describe('GET /users/:id (E2E)', () => {
  let app: INestApplication;
  let repository: UserRepository;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule],
      controllers: [GetUserController, RegisterUserController, GetUsersController],
      providers: [
        GetUserByIdQueryHandler,
        GetUsersQueryHandler,
        RegisterUserCommandHandler,
        { provide: USER_REPOSITORY, useFactory: () => new UserInMemoryRepository(false) },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    repository = app.get<UserRepository>(USER_REPOSITORY);
    server = app.getHttpServer() as unknown as Server;
  });

  const clearRepo = async () => {
    (repository as any).users.clear();
  };

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearRepo();
  });

  it('returns a user when found', async () => {
    // Create user via endpoint
    await request(server)
      .post('/users')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    // Find the user to get its ID
    const getUsersRes = await request(server)
      .get('/users')
      .query({ email: 'test@example.com' })
      .expect(200);

    const userId = getUsersRes.body.data[0].id;

    const res = await request(server).get(`/users/${userId}`).expect(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.username).toBe('testuser');
    expect(res.body.email).toBe('test@example.com');
  });

  it('returns 404 Not Found when not found', async () => {
    await request(server).get(`/users/${uuid()}`).expect(404);
  });

  it('returns 422 Unprocessable Entity when invalid id', async () => {
    await request(server).get(`/users/invalid-id`).expect(422);
  });
});
