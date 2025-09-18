import { GetUsersCursor_QueryHandler } from './get-users-cursor.query-handler';
import { GetUsersCursor_Query } from './get-users-cursor.query';
import { User_InMemory_Repository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { UserRoleEnum } from '@bc/auth/domain/value-objects';
import { InfrastructureException } from '@libs/nestjs-common';

describe('GetUsersCursor_QueryHandler', () => {
  // Test data factory
  const createQuery = (overrides: Partial<GetUsersCursor_Query> = {}) =>
    new GetUsersCursor_Query({
      ...overrides,
    });

  // Setup factory
  const setup = async (numUsers: number, params: { shouldFailRepository?: boolean } = {}) => {
    const { shouldFailRepository = false } = params;

    const repository = new User_InMemory_Repository(shouldFailRepository);
    const handler = new GetUsersCursor_QueryHandler(repository);

    const users = Array.from({ length: numUsers }).map(() => User.random());
    for (const user of users) {
      await repository.save(user);
    }

    return { repository, handler, users };
  };

  describe('Listing and filters', () => {
    it('should return all users when no filters provided', async () => {
      // Arrange
      const { handler, users } = await setup(5);

      // Act
      const query = createQuery();
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(users.length);
      users.forEach((u) => expect(result.data).toContainEqual(u.toValue()));
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const { handler, users } = await setup(10);

      // Act
      const query = createQuery({
        status: users[0].status.toValue(),
      });
      const usersWithStatus = users.filter((u) => u.status.toValue() === query.status);
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(usersWithStatus.length);
      usersWithStatus.forEach((u) => expect(result.data).toContainEqual(u.toValue()));
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should filter by id (exact), email and username', async () => {
      // Arrange
      const { handler, users } = await setup(10);

      // Act
      const queryById = createQuery({ userId: users[0].id.toValue() });
      const resultsById = await handler.execute(queryById);

      const emailSubstring = users[1].email.toValue().substring(0, 5);
      const queryByEmail = createQuery({ email: emailSubstring });
      const resultsByEmail = await handler.execute(queryByEmail);

      const usernameSubstring = users[2].username.toValue().substring(0, 3);
      const queryByUsername = createQuery({ username: usernameSubstring });
      const resultsByUsername = await handler.execute(queryByUsername);

      // Assert
      expect(resultsById.data).toHaveLength(1);
      expect(resultsById.data[0]).toEqual(users[0].toValue());

      expect(resultsByEmail.data.length).toBeGreaterThanOrEqual(1);
      expect(resultsByEmail.data.some((u) => u.email.includes(emailSubstring))).toBe(true);

      expect(resultsByUsername.data.length).toBeGreaterThanOrEqual(1);
      expect(resultsByUsername.data.some((u) => u.username.includes(usernameSubstring))).toBe(true);
    });
  });

  describe('Role filtering', () => {
    it('should filter by role', async () => {
      // Arrange
      const { handler, users } = await setup(10);

      // Act
      const role = users[0].role.toValue();
      const query = createQuery({ role });
      const result = await handler.execute(query);
      const usersWithRole = users.filter((u) => u.role.toValue() === role);

      // Assert
      expect(result.data).toHaveLength(usersWithRole.length);
      usersWithRole.forEach((u) => expect(result.data).toContainEqual(u.toValue()));
      expect(result.pagination.hasNext).toBe(false);
    });
  });

  describe('Cursor pagination', () => {
    it('should order by username ASC when orderBy is provided', async () => {
      // Arrange
      const { handler, users } = await setup(5);

      // Act
      const query = createQuery({
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
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should apply limit and return cursor for pagination', async () => {
      // Arrange
      const { handler, users } = await setup(5);
      const pageSize = 2;

      // Act
      const page1 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: pageSize,
          },
        }),
      );
      const usersSorted = users.sort((a, b) =>
        a.username.toValue().localeCompare(b.username.toValue()),
      );

      // Assert
      expect(page1.data).toHaveLength(pageSize);
      expect(page1.data.map((u) => u.username)).toEqual(
        usersSorted.slice(0, pageSize).map((u) => u.username.toValue()),
      );
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.cursor).toBeDefined();
    });

    it('should use cursor to get next page', async () => {
      // Arrange
      const { handler, users } = await setup(5);
      const pageSize = 2;

      // Act - Get first page
      const page1 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: pageSize,
          },
        }),
      );

      const page2 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: pageSize,
            cursor: page1.pagination.cursor,
          },
        }),
      );

      const page3 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: pageSize,
            cursor: page2.pagination.cursor,
          },
        }),
      );

      const usersSorted = users.sort((a, b) =>
        a.username.toValue().localeCompare(b.username.toValue()),
      );

      // Assert
      expect(page1.data).toHaveLength(pageSize);
      expect(page1.data.map((u) => u.username)).toEqual(
        usersSorted.slice(0, pageSize).map((u) => u.username.toValue()),
      );
      expect(page1.pagination.hasNext).toBe(true);

      expect(page2.data).toHaveLength(pageSize);
      expect(page2.data.map((u) => u.username)).toEqual(
        usersSorted.slice(pageSize, pageSize * 2).map((u) => u.username.toValue()),
      );
      expect(page2.pagination.hasNext).toBe(true);

      expect(page3.data).toHaveLength(1);
      expect(page3.data.map((u) => u.username)).toEqual(
        usersSorted.slice(pageSize * 2, pageSize * 3).map((u) => u.username.toValue()),
      );
      expect(page3.pagination.hasNext).toBe(false);
    });

    it('should return empty results when cursor is on the last page', async () => {
      // Arrange
      const { handler } = await setup(5);

      // Act
      const result1 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 10,
          },
        }),
      );

      const result2 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 10,
            cursor: result1.pagination.cursor,
          },
        }),
      );

      // Assert
      expect(result1.data).toHaveLength(5);
      expect(result1.pagination.hasNext).toBe(false);
      expect(result1.pagination.cursor).toBeDefined();

      expect(result2.data).toHaveLength(0);
      expect(result2.pagination.hasNext).toBe(false);
      expect(result2.pagination.cursor).toBeUndefined();
    });

    it('should handle cursor pagination with filters', async () => {
      // Arrange
      const { handler, users } = await setup(30);
      const usersWithRole = users.filter((u) => u.role.toValue() === UserRoleEnum.USER);
      const pageSize = 1;
      // Act - Get users with role USER, paginated
      const page1 = await handler.execute(
        createQuery({
          role: UserRoleEnum.USER,
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: pageSize,
          },
        }),
      );

      const page2 = await handler.execute(
        createQuery({
          role: UserRoleEnum.USER,
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: pageSize,
            cursor: page1.pagination.cursor,
          },
        }),
      );
      const sortedUsersWithRole = usersWithRole.sort((a, b) =>
        a.username.toValue().localeCompare(b.username.toValue()),
      );

      // Assert
      expect(page1.data).toHaveLength(pageSize);

      expect(page1.data.map((u) => u.username)).toEqual(
        sortedUsersWithRole.slice(0, pageSize).map((u) => u.username.toValue()),
      );
      expect(page1.pagination.hasNext).toBe(usersWithRole.length > pageSize);

      expect(page2.data).toHaveLength(pageSize);
      expect(page2.data.map((u) => u.username)).toEqual(
        sortedUsersWithRole.slice(pageSize, pageSize * 2).map((u) => u.username.toValue()),
      );
    });

    it('should use tiebreaker when provided', async () => {
      // Arrange
      const { handler, users } = await setup(5);
      const pageSize = 2;

      // Act
      const query = createQuery({
        pagination: {
          sort: { field: 'username', order: 'asc' },
          limit: pageSize,
        },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(pageSize);
      expect(result.pagination.hasNext).toBe(users.length > pageSize);
      expect(result.pagination.cursor).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty repository', async () => {
      // Arrange
      const { handler } = await setup(0);

      // Act
      const query = createQuery();
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.cursor).toBeUndefined();
    });

    it('should handle limit of 0', async () => {
      // Arrange
      const { handler, users } = await setup(5);

      // Act
      const query = createQuery({
        pagination: { limit: 0 },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(users.length);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should handle very large limit', async () => {
      // Arrange
      const { handler, users } = await setup(5);

      // Act
      const query = createQuery({
        pagination: { limit: 1000 },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(users.length); // Only available users
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should maintain consistent cursors across identical queries', async () => {
      // Arrange
      const { handler } = await setup(5);
      const pageSize = 2;

      // Act - Run same query twice
      const query = createQuery({
        pagination: {
          sort: { field: 'username', order: 'asc' },
          limit: pageSize,
        },
      });
      const result1 = await handler.execute(query);
      const result2 = await handler.execute(query);

      // Assert
      expect(result1.pagination.cursor).toBe(result2.pagination.cursor);
      expect(result1.data).toEqual(result2.data);
    });

    it('should handle multiple pages traversal consistently', async () => {
      // Arrange
      const { handler, users } = await setup(6);
      const pageSize = 2;

      // Act - Traverse through all pages
      const allUsernames: string[] = [];
      let cursor: string | undefined;
      let hasNext = true;

      while (hasNext) {
        const page = await handler.execute(
          createQuery({
            pagination: {
              sort: { field: 'username', order: 'asc' },
              limit: pageSize,
              cursor: cursor,
            },
          }),
        );

        allUsernames.push(...page.data.map((u) => u.username));
        cursor = page.pagination.cursor;
        hasNext = page.pagination.hasNext || false;
      }
      const expectedUsernames = users
        .sort((a, b) => a.username.toValue().localeCompare(b.username.toValue()))
        .map((u) => u.username.toValue());

      // Assert - Should get all users in correct order
      expect(allUsernames).toEqual(expectedUsernames);
    });

    it('should throw InfrastructureException if repository fails', async () => {
      // Arrange
      const { handler } = await setup(0, { shouldFailRepository: true });
      const query = createQuery();

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(InfrastructureException);
    });
  });
});
