import { GetUsers_QueryHandler } from './get-users.query-handler';
import { GetUsers_Query } from './get-users.query';
import { User_InMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user.in-memory-repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { InfrastructureException } from '@libs/nestjs-common';

describe('GetUsers_QueryHandler', () => {
  const setup = async (params: { shouldFailRepository?: boolean; withUsers?: number } = {}) => {
    const { shouldFailRepository = false, withUsers = 0 } = params;

    const repository = new User_InMemoryRepository(shouldFailRepository);
    const handler = new GetUsers_QueryHandler(repository);

    const users = Array.from({ length: withUsers }).map(() => User.random());
    for (const user of users) {
      await repository.save(user);
    }

    return { repository, handler, users };
  };

  describe('Listing and filters', () => {
    it('should return all users when no filters provided', async () => {
      // Arrange
      const { handler, users } = await setup({ withUsers: 10 });

      // Act
      const query = new GetUsers_Query({});
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(users.length);
      users.forEach((u) => expect(result.data).toContainEqual(u.toValue()));
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const { handler, users } = await setup({ withUsers: 10 });

      // Act
      const query = new GetUsers_Query({ status: users[0].status.toValue() });
      const usersWithStatus = users.filter((u) => u.status.toValue() === query.status);
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(usersWithStatus.length);
      usersWithStatus.forEach((u) => expect(result.data).toContainEqual(u.toValue()));
    });

    it('should filter by id, email, username', async () => {
      // Arrange
      const { handler, users } = await setup({ withUsers: 10 });
      // Act
      const queryById = new GetUsers_Query({ userId: users[0].id.toValue() });
      const resultsById = await handler.execute(queryById);

      const queryByEmail = new GetUsers_Query({ email: users[1].email.toValue() });
      const resultsByEmail = await handler.execute(queryByEmail);

      const queryByUsername = new GetUsers_Query({ username: users[2].username.toValue() });
      const resultsByUsername = await handler.execute(queryByUsername);

      // Assert
      expect(resultsById.data).toHaveLength(1);
      expect(resultsById.data[0]).toEqual(users[0].toValue());

      expect(resultsByEmail.data).toHaveLength(1);
      expect(resultsByEmail.data[0]).toEqual(users[1].toValue());

      expect(resultsByUsername.data).toHaveLength(1);
      expect(resultsByUsername.data[0]).toEqual(users[2].toValue());
    });
  });

  describe('Ordering and pagination', () => {
    it('should order by username ASC when orderBy is provided', async () => {
      // Arrange
      const { handler, users } = await setup({ withUsers: 10 });

      // Act
      const query = new GetUsers_Query({
        pagination: { sort: { field: 'username', order: 'asc' } },
      });
      const usersSorted = users.sort((a, b) =>
        a.username.toValue().localeCompare(b.username.toValue()),
      );
      const result = await handler.execute(query);

      // Assert
      expect(result.data.map((u) => u.username)).toEqual(
        usersSorted.map((u) => u.username.toValue()),
      );
    });

    it('should apply limit and offset with sorting', async () => {
      // Arrange
      const { handler, users } = await setup({ withUsers: 5 });
      const pageSize = 2;

      // Act
      const page1 = await handler.execute(
        new GetUsers_Query({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: pageSize,
            offset: 0,
          },
        }),
      );
      const page2 = await handler.execute(
        new GetUsers_Query({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: pageSize,
            offset: pageSize,
          },
        }),
      );

      const page3 = await handler.execute(
        new GetUsers_Query({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: pageSize,
            offset: pageSize * 2,
          },
        }),
      );
      const usersSorted = users.sort((a, b) =>
        a.username.toValue().localeCompare(b.username.toValue()),
      );

      // Assert
      expect(page1.data.map((u) => u.username)).toEqual(
        usersSorted.slice(0, pageSize).map((u) => u.username.toValue()),
      );
      expect(page2.data.map((u) => u.username)).toEqual(
        usersSorted.slice(pageSize, pageSize * 2).map((u) => u.username.toValue()),
      );
      expect(page3.data.map((u) => u.username)).toEqual(
        usersSorted.slice(pageSize * 2, pageSize * 3).map((u) => u.username.toValue()),
      );
    });
  });

  describe('Role filtering', () => {
    it('should filter by role', async () => {
      // Arrange
      const { handler, users } = await setup({ withUsers: 10 });

      // Act
      const role = users[0].role.toValue();
      const onlyAdmins = await handler.execute(new GetUsers_Query({ role }));
      const usersWithRole = users.filter((u) => u.role.toValue() === role);

      // Assert
      expect(onlyAdmins.data).toHaveLength(usersWithRole.length);
      usersWithRole.forEach((u) => expect(onlyAdmins.data).toContainEqual(u.toValue()));
    });
  });

  describe('Error Cases', () => {
    it('should throw InfrastructureException if repository fails', async () => {
      // Arrange
      const { handler } = await setup({ shouldFailRepository: true });
      const query = new GetUsers_Query({});

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(InfrastructureException);
    });
  });
});
