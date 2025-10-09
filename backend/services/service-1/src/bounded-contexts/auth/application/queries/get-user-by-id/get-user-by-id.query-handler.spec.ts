import { GetUserById_QueryHandler } from './get-user-by-id.query-handler';
import { GetUserById_Query } from './get-user-by-id.query';
import { User_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user.in-memory-repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { NotFoundException, InfrastructureException, Id } from '@libs/nestjs-common';

describe('GetUserById_QueryHandler', () => {
  const createQuery = (overrides: Partial<GetUserById_Query> = {}) =>
    new GetUserById_Query({
      userId: Id.random().toValue(),
      ...overrides,
    });

  const setup = (params: { shouldFailRepository?: boolean } = {}) => {
    const { shouldFailRepository = false } = params;

    const repository = new User_InMemoryRepository(shouldFailRepository);
    const handler = new GetUserById_QueryHandler(repository);

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
    const query = createQuery();

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
