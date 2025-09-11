import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { CqrsModule } from '@nestjs/cqrs';
import { ErrorHandlingModule } from '@libs/nestjs-common';
import { GetUserController } from '../../src/bounded-contexts/auth/interfaces/http/controllers/users/get-user-by-id/get-user-by-id.controller';
import { GetUserByIdQueryHandler } from '../../src/bounded-contexts/auth/application/queries/get-user-by-id/get-user-by-id.query-handler';
import type { UserRepository } from '../../src/bounded-contexts/auth/domain/repositories/user/user.repository';
import { USER_REPOSITORY } from '../../src/bounded-contexts/auth/domain/repositories/user/user.repository';
import { UserInMemoryRepository } from '../../src/bounded-contexts/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../src/bounded-contexts/auth/domain/entities/user/user.entity';

describe('GET /users/:id (E2E)', () => {
  let app: INestApplication;
  let repository: UserRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule],
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a user when found', async () => {
    const user = User.random();
    await repository.save(user);

    const server: Server = app.getHttpServer();
    const res = await request(server).get(`/users/${user.id}`).expect(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.username).toBe(user.username.toValue());
    expect(res.body.email).toBe(user.email.toValue());
  });

  it('returns 404 when not found', async () => {
    const server: Server = app.getHttpServer();
    await request(server).get(`/users/non-existent-id`).expect(404);
  });
});
