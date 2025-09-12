import { GetUsersQueryHandler } from './get-users.query-handler';
import { GetUsersQuery } from './get-users.query';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../../domain/entities/user/user.entity';
import { Email, Username, UserStatus, UserStatusEnum, UserRoleEnum } from '../../../domain/value-objects';
import { UserTestFactory } from '../../../test-utils';
import { InfrastructureException } from '@libs/nestjs-common';

describe('GetUsersQueryHandler', () => {
  // Test data factory
  const createQuery = (overrides: Partial<GetUsersQuery> = {}) => new GetUsersQuery({
    ...overrides,
  });

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean } = {}) => {
    const { shouldFailRepository = false } = params;

    const repository = new UserInMemoryRepository(shouldFailRepository);
    const handler = new GetUsersQueryHandler(repository);
    
    const seedUsers = async () => {
      const users = UserTestFactory.createStandardTestUsers();
      await UserTestFactory.saveUsersToRepository(repository, users);
      return users;
    };
    
    return { repository, handler, seedUsers };
  };

  describe('Listing and filters', () => {
    it('should return all users when no filters provided', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      const users = await seedUsers();

      // Act
      const query = createQuery();
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(users.length);
      users.forEach((u) => expect(result.data).toContainEqual(u.toValue()));
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const { handler, repository, seedUsers } = setup();
      await seedUsers();
      const inactive = User.random({
        email: new Email('inactive2@example.com'),
        username: new Username('inactive2'),
        status: UserStatus.inactive(),
      });
      await repository.save(inactive);

      // Act
      const query = createQuery({ status: UserStatusEnum.INACTIVE });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].username).toBe(inactive.username.toValue());
    });

    it('should filter by id, email, username (contains)', async () => {
      // Arrange
      const { handler, repository, seedUsers } = setup();
      await seedUsers();
      const userFound = await repository.findAll();
      // Act
      const queryById = createQuery({ userId: userFound[0].id });
      const resultsById = await handler.execute(queryById);

      const queryByEmail = createQuery({ email: 'admin@' });
      const resultsByEmail = await handler.execute(queryByEmail);

      const queryByUsername = createQuery({ username: 'user1' });
      const resultsByUsername = await handler.execute(queryByUsername);

      // Assert
      expect(resultsById.data).toHaveLength(1);
      expect(resultsById.data[0].username).toBe(userFound[0].username.toValue());
      
      expect(resultsByEmail.data).toHaveLength(1);
      expect(resultsByEmail.data[0].username).toBe('admin');

      expect(resultsByUsername.data).toHaveLength(1);
      expect(resultsByUsername.data[0].username).toBe('user1');
    });
  });

  describe('Ordering and pagination', () => {
    it('should order by username ASC when orderBy is provided', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const query = createQuery({
        pagination: { sort: { field: 'username', order: 'asc' } },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data.map((u) => u.username)).toEqual(['admin', 'user1', 'user2']);
    });

    it('should apply limit and offset', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const page1 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 2,
            offset: 0,
          },
        }),
      );
      const page2 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 2,
            offset: 2,
          },
        }),
      );

      // Assert
      expect(page1.data.map((u) => u.username)).toEqual(['admin', 'user1']);
      expect(page2.data.map((u) => u.username)).toEqual(['user2']);
    });
  });

  describe('Role filtering', () => {
    it('should return only admins when role=ADMIN', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const query = createQuery({ role: UserRoleEnum.ADMIN });
      const onlyAdmins = await handler.execute(query);

      // Assert
      expect(onlyAdmins.data).toHaveLength(1);
      expect(onlyAdmins.data[0].role).toBe(UserRoleEnum.ADMIN);
    });

    it('should return only users when role=USER', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const query = createQuery({ role: UserRoleEnum.USER });
      const onlyUsers = await handler.execute(query);

      // Assert
      expect(onlyUsers.data).toHaveLength(2);
      expect(new Set(onlyUsers.data.map((u) => u.role))).toEqual(new Set([UserRoleEnum.USER]));
    });
  });

  describe('Error Cases', () => {
    it('should throw InfrastructureException if repository fails', async () => {
      // Arrange
      const { handler } = setup({ shouldFailRepository: true });
      const query = createQuery();

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(InfrastructureException);
    });
  });
});
