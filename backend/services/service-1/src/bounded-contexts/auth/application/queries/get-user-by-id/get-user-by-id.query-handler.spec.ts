import { GetUserByIdQueryHandler } from './get-user-by-id.query-handler';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { Email, Username } from '@bc/auth/domain/value-objects';
import { NotFoundException, InfrastructureException, Id } from '@libs/nestjs-common';

describe('GetUserByIdQueryHandler', () => {
  // Test data factory
  const createQuery = (overrides: Partial<GetUserByIdQuery> = {}) =>
    new GetUserByIdQuery({
      userId: Id.random().toValue(),
      ...overrides,
    });

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean } = {}) => {
    const { shouldFailRepository = false } = params;

    const repository = new UserInMemoryRepository(shouldFailRepository);
    const handler = new GetUserByIdQueryHandler(repository);

    return { repository, handler };
  };

  it('should return the user DTO when user exists', async () => {
    // Arrange
    const { handler, repository } = setup();
    const user = User.random();
    await repository.save(user);

    const query = createQuery({ userId: user.id.toValue() });

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result).toBeDefined();
    expect(result).toEqual(user.toValue());
  });

  it('should throw NotFoundException when user does not exist', async () => {
    // Arrange
    const { handler } = setup();
    const query = createQuery({ userId: Id.random().toValue() });

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should throw InfrastructureException if repository fails', async () => {
    // Arrange
    const { handler } = setup({ shouldFailRepository: true });
    const query = createQuery();

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(InfrastructureException);
  });
});
