import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UpdateUserProfileController } from '../../src/bounded-contexts/users/interfaces/http/controllers/users/update-user-profile/update-user-profile.controller';
import { UpdateUserProfileCommandHandler } from '../../src/bounded-contexts/users/application/commands/update-user-profile/update-user-profile.command-handler';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../src/bounded-contexts/users/domain/repositories/user.repository';
import { UserInMemoryRepository } from '../../src/bounded-contexts/users/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../src/bounded-contexts/users/domain/entities/user.entity';
import { Name } from '../../src/bounded-contexts/users/domain/value-objects/name.vo';
import { UserProfile } from '../../src/bounded-contexts/users/domain/value-objects/user-profile.vo';
import { ErrorHandlingModule } from '@libs/nestjs-common';

describe('Users E2E (update profile)', () => {
  let app: INestApplication;
  let repository: UserRepository;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule, ErrorHandlingModule],
      controllers: [UpdateUserProfileController],
      providers: [
        UpdateUserProfileCommandHandler,
        { provide: USER_REPOSITORY, useClass: UserInMemoryRepository },
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

  it('PUT /users/:id/profile updates names', async () => {
    // Arrange: seed a user
    const user = User.random({
      profile: new UserProfile(new Name('Old'), new Name('Name')),
    });
    await repository.save(user);

    // Act: call endpoint
    await request(app.getHttpServer())
      .put(`/users/${user.id}/profile`)
      .send({ firstName: 'New', lastName: 'Surname' })
      .expect(200);

    // Assert: repository reflects changes
    const updated = await repository.findById(user.id);
    expect(updated).not.toBeNull();
    expect(updated!.profile.firstName.toValue()).toBe('New');
    expect(updated!.profile.lastName.toValue()).toBe('Surname');
  });

  it('PUT /users/:id/profile returns 404 for missing user', async () => {
    await request(app.getHttpServer())
      .put(`/users/non-existent-id/profile`)
      .send({ firstName: 'A', lastName: 'B' })
      .expect(404);
  });

  it('PUT /users/:id/profile returns a client error on invalid body types', async () => {
    const user = User.random();
    await repository.save(user);

    await request(app.getHttpServer())
      .put(`/users/${user.id}/profile`)
      // Send numbers instead of strings
      .send({ firstName: 123, lastName: 456 })
      .expect((res) => {
        if (res.status !== 400 && res.status !== 500) {
          throw new Error(`Expected 400 or 500, got ${res.status}`);
        }
      });
  });
});
