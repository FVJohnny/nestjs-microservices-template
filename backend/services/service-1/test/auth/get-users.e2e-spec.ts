import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { GetUsersController } from '@bc/auth/interfaces/controllers/users/get-users/get-users.controller';
import { RegisterUserController } from '@bc/auth/interfaces/controllers/users/register-user/register-user.controller';
import { GetUsersQueryHandler } from '@bc/auth/application/queries';
import { RegisterUserCommandHandler } from '@bc/auth/application/commands';
import type { UserRepository } from '@bc/auth/domain/repositories/user/user.repository';
import { USER_REPOSITORY } from '@bc/auth/domain/repositories/user/user.repository';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { ErrorHandlingModule } from '@libs/nestjs-common';

describe('GET /users (E2E)', () => {
  let app: INestApplication;
  let repository: UserRepository;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule],
      controllers: [GetUsersController, RegisterUserController],
      providers: [
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

  it('returns all users when no filters provided', async () => {
    // Arrange: create users via endpoints
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!', role: 'admin' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!', role: 'user' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!', role: 'user' },
    ];

    for (const data of userData) {
      await request(server).post('/users').send(data).expect(201);
    }

    // Act
    const res = await request(server).get('/users').expect(200);

    // Assert
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);
    const usernames = res.body.data.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['admin', 'user1', 'user2']);
  });

  it('filters by status', async () => {
    // Create users via endpoints
    await request(server)
      .post('/users')
      .send({
        email: 'inactive@example.com',
        username: 'inactive',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    await request(server)
      .post('/users')
      .send({
        email: 'active@example.com',
        username: 'active',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    const res = await request(server)
      .get('/users')
      .query({ status: 'email-verification-pending' })
      .expect(200);
    expect(res.body.data).toHaveLength(2);

    const res2 = await request(server).get('/users').query({ status: 'active' }).expect(200);
    expect(res2.body.data).toHaveLength(0);
  });

  it('supports contains filters: id, email, username', async () => {
    // Create users via endpoints
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!', role: 'admin' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!', role: 'user' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!', role: 'user' },
    ];

    for (const data of userData) {
      await request(server).post('/users').send(data).expect(201);
    }

    const adminLookup = await request(server)
      .get('/users')
      .query({ email: 'admin@example.com' })
      .expect(200);
    const adminId = adminLookup.body.data[0].id;

    const byId = await request(server).get('/users').query({ userId: adminId }).expect(200);
    expect(byId.body.data).toHaveLength(1);
    expect(byId.body.data[0].username).toBe('admin');

    const byEmail = await request(server).get('/users').query({ email: 'user1' }).expect(200);
    expect(byEmail.body.data).toHaveLength(1);
    expect(byEmail.body.data[0].username).toBe('user1');

    const byUsername = await request(server).get('/users').query({ username: 'user2' }).expect(200);
    expect(byUsername.body.data).toHaveLength(1);
    expect(byUsername.body.data[0].username).toBe('user2');
  });

  it('filters by role equality', async () => {
    // Create users via endpoints
    await request(server)
      .post('/users')
      .send({
        email: 'admin@example.com',
        username: 'admin',
        password: 'Password123!',
        role: 'admin',
      })
      .expect(201);

    await request(server)
      .post('/users')
      .send({
        email: 'user@example.com',
        username: 'user',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    const onlyAdmins = await request(server).get('/users').query({ role: 'admin' }).expect(200);
    expect(onlyAdmins.body.data).toHaveLength(1);
    expect(onlyAdmins.body.data[0].username).toBe('admin');

    const onlyUsers = await request(server).get('/users').query({ role: 'user' }).expect(200);
    expect(onlyUsers.body.data).toHaveLength(1);
    expect(onlyUsers.body.data[0].username).toBe('user');
  });

  it('orders by username asc and paginates with limit/offset', async () => {
    // Create users via endpoints
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!', role: 'admin' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!', role: 'user' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!', role: 'user' },
    ];

    for (const data of userData) {
      await request(server).post('/users').send(data).expect(201);
    }

    const ordered = await request(server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'asc' })
      .expect(200);
    expect(ordered.body.data.map((u: any) => u.username)).toEqual(['admin', 'user1', 'user2']);

    const page = await request(server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'asc', limit: 2, offset: 1 })
      .expect(200);
    expect(page.body.data.map((u: any) => u.username)).toEqual(['user1', 'user2']);
  });

  it('rejects invalid orderType with 422 (validation)', async () => {
    // Create a user via endpoint
    await request(server)
      .post('/users')
      .send({
        email: 'alpha@example.com',
        username: 'alpha',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    await request(server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'INVALID_ORDER_TYPE' })
      .expect(422);
  });
});
