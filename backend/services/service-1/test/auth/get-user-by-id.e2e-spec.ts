import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ErrorHandlingModule, JwtAuthModule } from '@libs/nestjs-common';
import { GetUserController } from '../../src/bounded-contexts/auth/interfaces/controllers/users/get-user-by-id/get-user-by-id.controller';
import { GetUserByIdQueryHandler } from '../../src/bounded-contexts/auth/application/queries/get-user-by-id/get-user-by-id.query-handler';
import type { UserRepository } from '../../src/bounded-contexts/auth/domain/repositories/user/user.repository';
import { USER_REPOSITORY } from '../../src/bounded-contexts/auth/domain/repositories/user/user.repository';
import { UserInMemoryRepository } from '../../src/bounded-contexts/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../src/bounded-contexts/auth/domain/entities/user/user.entity';
import { AuthTestHelper } from '../utils/auth-test.helper';

describe('GET /users/:id (E2E)', () => {
  let app: INestApplication;
  let repository: UserRepository;
  let authHelper: AuthTestHelper;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule, JwtAuthModule],
      controllers: [GetUserController],
      providers: [
        GetUserByIdQueryHandler,
        { provide: USER_REPOSITORY, useFactory: () => new UserInMemoryRepository(false) },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    repository = app.get<UserRepository>(USER_REPOSITORY);

    // Initialize auth helper
    const jwtService = app.get<JwtService>(JwtService);
    authHelper = new AuthTestHelper(jwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a user when found', async () => {
    const user = User.random();
    await repository.save(user);

    const token = authHelper.createAuthToken(user);
    const server: Server = app.getHttpServer();
    const res = await request(server)
      .get(`/users/${user.id.toValue()}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.id).toBe(user.id.toValue());
    expect(res.body.username).toBe(user.username.toValue());
    expect(res.body.email).toBe(user.email.toValue());
  });

  it('returns 404 when not found', async () => {
    // Create any user to get a valid token for auth
    const user = User.random();
    await repository.save(user);
    const token = authHelper.createAuthToken(user);

    const server: Server = app.getHttpServer();
    await request(server)
      .get(`/users/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
  });
});
