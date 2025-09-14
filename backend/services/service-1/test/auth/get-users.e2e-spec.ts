import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { GetUsersController } from '../../src/bounded-contexts/auth/interfaces/controllers/users/get-users/get-users.controller';
import { GetUsersQueryHandler } from '../../src/bounded-contexts/auth/application/queries';
import type { UserRepository } from '../../src/bounded-contexts/auth/domain/repositories/user/user.repository';
import { USER_REPOSITORY } from '../../src/bounded-contexts/auth/domain/repositories/user/user.repository';
import { UserInMemoryRepository } from '../../src/bounded-contexts/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../src/bounded-contexts/auth/domain/entities/user/user.entity';
import {
  Email,
  Username,
  UserRole,
  UserStatus,
} from '../../src/bounded-contexts/auth/domain/value-objects';
import { JwtAuthModule } from '@libs/nestjs-common';
import { ErrorHandlingModule } from '@libs/nestjs-common';
import { AuthTestHelper } from '../utils/auth-test.helper';

describe('GET /users (E2E)', () => {
  let app: INestApplication;
  let repository: UserRepository;
  let server: Server;
  let authHelper: AuthTestHelper;
  let adminUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule, JwtAuthModule],
      controllers: [GetUsersController],
      providers: [
        GetUsersQueryHandler,
        { provide: USER_REPOSITORY, useFactory: () => new UserInMemoryRepository(false) },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    repository = app.get<UserRepository>(USER_REPOSITORY);
    server = app.getHttpServer() as unknown as Server;

    // Initialize auth helper and create admin user
    const jwtService = app.get<JwtService>(JwtService);
    authHelper = new AuthTestHelper(jwtService);

    // Create admin user for authentication
    adminUser = User.random({
      email: new Email('admin@test.com'),
      username: new Username('testadmin'),
      role: UserRole.admin(),
      status: UserStatus.active(),
    });
    await repository.save(adminUser);
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
        status: UserStatus.active(),
      }),
      User.random({
        email: new Email('user1@example.com'),
        username: new Username('user1'),
        role: UserRole.user(),
        status: UserStatus.active(),
      }),
      User.random({
        email: new Email('user2@example.com'),
        username: new Username('user2'),
        role: UserRole.user(),
        status: UserStatus.active(),
      }),
    ];
    for (const u of users) await repository.save(u);

    // Act
    const token = authHelper.createAuthToken(adminUser);
    const res = await request(server)
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Assert
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);
    const usernames = res.body.data.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['admin', 'user1', 'user2']);
  });

  it('filters by status=inactive', async () => {
    const inactive = User.random({ status: UserStatus.inactive() });
    const active = User.random({ status: UserStatus.active() });
    await repository.save(inactive);
    await repository.save(active);

    const token = authHelper.createAuthToken(adminUser);
    const res = await request(server)
      .get('/users')
      .query({ status: 'inactive' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].username).toBe(inactive.username.toValue());
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

    const token = authHelper.createAuthToken(adminUser);
    const byId = await request(server)
      .get('/users')
      .query({ userId: admin.id.toValue() })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(byId.body.data).toHaveLength(1);
    expect(byId.body.data[0].username).toBe(admin.username.toValue());

    const byEmail = await request(server)
      .get('/users')
      .query({ email: 'admin@' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(byEmail.body.data).toHaveLength(1);
    expect(byEmail.body.data[0].username).toBe(admin.username.toValue());

    const byUsername = await request(server)
      .get('/users')
      .query({ username: 'user1' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(byUsername.body.data).toHaveLength(1);
    expect(byUsername.body.data[0].username).toBe(u1.username.toValue());
  });

  it('filters by role equality', async () => {
    const admin = User.random({ role: UserRole.admin() });
    const user = User.random({ role: UserRole.user() });
    await repository.save(admin);
    await repository.save(user);

    const token = authHelper.createAuthToken(adminUser);
    const onlyAdmins = await request(server)
      .get('/users')
      .query({ role: 'admin' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(onlyAdmins.body.data).toHaveLength(1);
    expect(onlyAdmins.body.data[0].username).toBe(admin.username.toValue());

    const onlyUsers = await request(server)
      .get('/users')
      .query({ role: 'user' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(onlyUsers.body.data).toHaveLength(1);
    expect(onlyUsers.body.data[0].username).toBe(user.username.toValue());
  });

  it('orders by username asc and paginates with limit/offset', async () => {
    const a = User.random({ username: new Username('admin') });
    const b = User.random({ username: new Username('user1') });
    const c = User.random({ username: new Username('user2') });
    await Promise.all([a, b, c].map((u) => repository.save(u)));

    const token = authHelper.createAuthToken(adminUser);
    const ordered = await request(server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'asc' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(ordered.body.data.map((u: any) => u.username)).toEqual(['admin', 'user1', 'user2']);

    const page = await request(server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'asc', limit: 2, offset: 1 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(page.body.data.map((u: any) => u.username)).toEqual(['user1', 'user2']);
  });

  it('rejects invalid orderType with 422 (validation)', async () => {
    const u = User.random({ username: new Username('alpha') });
    await repository.save(u);
    const token = authHelper.createAuthToken(adminUser);
    await request(server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'ASC' })
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
  });
});
