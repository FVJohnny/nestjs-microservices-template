import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { GetUsersController } from '../../src/bounded-contexts/auth/interfaces/http/controllers/users/get-users/get-users.controller';
import { GetUsersQueryHandler } from '../../src/bounded-contexts/auth/application/queries/get-users/get-users.query-handler';
import type { UserRepository } from '../../src/bounded-contexts/auth/domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../src/bounded-contexts/auth/domain/repositories/user.repository';
import { UserInMemoryRepository } from '../../src/bounded-contexts/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../src/bounded-contexts/auth/domain/entities/user.entity';
import { Email } from '../../src/bounded-contexts/auth/domain/value-objects/email.vo';
import { Username } from '../../src/bounded-contexts/auth/domain/value-objects/username.vo';
import { UserRole } from '../../src/bounded-contexts/auth/domain/value-objects/user-role.vo';
import { UserStatus } from '../../src/bounded-contexts/auth/domain/value-objects/user-status.vo';

describe('GET /users (E2E)', () => {
  let app: INestApplication;
  let repository: UserRepository;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [GetUsersController],
      providers: [
        GetUsersQueryHandler,
        { provide: USER_REPOSITORY, useClass: UserInMemoryRepository },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    repository = app.get<UserRepository>(USER_REPOSITORY);
    server = app.getHttpServer() as unknown as Server;
  });

  const clearRepo = async () => {
    const all = await repository.findAll();
    await Promise.all(all.map((u) => repository.remove(u.id)));
  };

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearRepo();
  });

  it('returns all users when no filters provided', async () => {
    // Arrange: seed a few users
    const users = [
      User.random({
        email: new Email('admin@example.com'),
        username: new Username('admin'),
        role: UserRole.admin(),
      }),
      User.random({
        email: new Email('user1@example.com'),
        username: new Username('user1'),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('user2@example.com'),
        username: new Username('user2'),
        role: UserRole.user(),
      }),
    ];
    for (const u of users) await repository.save(u);

    // Act
    const res = await request(server).get('/users').expect(200);

    // Assert
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);
    const usernames = res.body.data.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['admin', 'user1', 'user2']);
  });

  it('filters by status=inactive', async () => {
    const inactive = User.random({
      username: new Username('inactive'),
      status: UserStatus.inactive(),
    });
    const active = User.random({ username: new Username('active') });
    await repository.save(inactive);
    await repository.save(active);

    const res = await request(server).get('/users').query({ status: 'inactive' }).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].username).toBe('inactive');
  });

  it('supports contains filters: id, email, username', async () => {
    const admin = User.random({
      email: new Email('admin@example.com'),
      username: new Username('admin'),
    });
    const u1 = User.random({
      email: new Email('user1@example.com'),
      username: new Username('user1'),
    });
    const u2 = User.random({
      email: new Email('user2@example.com'),
      username: new Username('user2'),
    });
    await Promise.all([admin, u1, u2].map((u) => repository.save(u)));

    const byId = await request(server).get('/users').query({ userId: admin.id }).expect(200);
    expect(byId.body.data).toHaveLength(1);
    expect(byId.body.data[0].username).toBe('admin');

    const byEmail = await request(server).get('/users').query({ email: 'admin@' }).expect(200);
    expect(byEmail.body.data).toHaveLength(1);
    expect(byEmail.body.data[0].username).toBe('admin');

    const byUsername = await request(server).get('/users').query({ username: 'user1' }).expect(200);
    expect(byUsername.body.data).toHaveLength(1);
    expect(byUsername.body.data[0].username).toBe('user1');
  });

  it('filters by role equality', async () => {
    const admin = User.random({
      username: new Username('admin'),
      role: UserRole.admin(),
    });
    const user = User.random({
      username: new Username('user'),
      role: UserRole.user(),
    });
    await repository.save(admin);
    await repository.save(user);

    const onlyAdmins = await request(server).get('/users').query({ role: 'admin' }).expect(200);
    expect(onlyAdmins.body.data).toHaveLength(1);
    expect(onlyAdmins.body.data[0].username).toBe('admin');

    const onlyUsers = await request(server).get('/users').query({ role: 'user' }).expect(200);
    expect(onlyUsers.body.data).toHaveLength(1);
    expect(onlyUsers.body.data[0].username).toBe('user');
  });

  it('orders by username asc and paginates with limit/offset', async () => {
    const a = User.random({ username: new Username('admin') });
    const b = User.random({ username: new Username('user1') });
    const c = User.random({ username: new Username('user2') });
    await Promise.all([a, b, c].map((u) => repository.save(u)));

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

  it('rejects invalid orderType with 400 (validation)', async () => {
    const u = User.random({ username: new Username('alpha') });
    await repository.save(u);
    await request(server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'ASC' })
      .expect(400);
  });
});
