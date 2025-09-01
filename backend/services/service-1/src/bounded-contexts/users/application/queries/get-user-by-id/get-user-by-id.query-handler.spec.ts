import { GetUserByIdQueryHandler } from './get-user-by-id.query-handler';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Name } from '../../../domain/value-objects/name.vo';
import { UserProfile } from '../../../domain/value-objects/user-profile.vo';
import { NotFoundException } from '@libs/nestjs-common';

describe('GetUserByIdQueryHandler', () => {
  let handler: GetUserByIdQueryHandler;
  let repository: UserInMemoryRepository;

  beforeEach(() => {
    repository = new UserInMemoryRepository();
    handler = new GetUserByIdQueryHandler(repository);
  });

  it('should return the user DTO when user exists', async () => {
    // Arrange
    const user = User.random({
      email: new Email('john.doe@example.com'),
      username: new Username('johndoe'),
      profile: new UserProfile(new Name('John'), new Name('Doe')),
    });
    await repository.save(user);

    const query = new GetUserByIdQuery({ userId: user.id } as any);

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result).toBeDefined();
    expect(result).toEqual(user.toValue());
  });

  it('should throw NotFoundException when user does not exist', async () => {
    // Arrange
    const query = new GetUserByIdQuery({ userId: 'non-existent-id' } as any);

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });
});

