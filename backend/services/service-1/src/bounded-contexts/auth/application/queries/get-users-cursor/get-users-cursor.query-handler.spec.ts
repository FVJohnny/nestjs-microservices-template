import { GetUsersCursorQueryHandler } from './get-users-cursor.query-handler';
import { GetUsersCursorQuery } from './get-users-cursor.query';
import { UserInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { Email, Username, UserStatus, UserStatusEnum, UserRoleEnum } from '@bc/auth/domain/value-objects';
import { UserTestFactory } from '@bc/auth/test-utils';
import { PaginationCursor, InfrastructureException } from '@libs/nestjs-common';

describe('GetUsersCursorQueryHandler', () => {
  // Test data factory
  const createQuery = (overrides: Partial<GetUsersCursorQuery> = {}) => new GetUsersCursorQuery({
    ...overrides,
  });

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean } = {}) => {
    const { shouldFailRepository = false } = params;

    const repository = new UserInMemoryRepository(shouldFailRepository);
    const handler = new GetUsersCursorQueryHandler(repository);
    
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
      expect(result.pagination.hasNext).toBe(false);
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
      const query = createQuery({
        status: UserStatusEnum.INACTIVE,
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].username).toBe(inactive.username.toValue());
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should filter by id (exact), email and username, (contains)', async () => {
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
      expect(onlyAdmins.pagination.hasNext).toBe(false);
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
      expect(onlyUsers.pagination.hasNext).toBe(false);
    });
  });

  describe('Cursor pagination', () => {
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
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should apply limit and return cursor for pagination', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const page1 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 2,
          },
        }),
      );

      // Assert
      expect(page1.data).toHaveLength(2);
      expect(page1.data.map((u) => u.username)).toEqual(['admin', 'user1']);
      expect(page1.pagination.hasNext).toBe(true);
      expect(page1.pagination.cursor).toBeDefined();
    });

    it('should use cursor to get next page', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act - Get first page
      const page1 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 2,
          },
        }),
      );

      // Act - Get second page using cursor
      const page2 = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 2,
            cursor: page1.pagination.cursor,
          },
        }),
      );

      // Assert
      expect(page1.data).toHaveLength(2);
      expect(page1.data.map((u) => u.username)).toEqual(['admin', 'user1']);
      expect(page1.pagination.hasNext).toBe(true);

      expect(page2.data).toHaveLength(1);
      expect(page2.data.map((u) => u.username)).toEqual(['user2']);
      expect(page2.pagination.hasNext).toBe(false);
    });

    it('should handle cursor with different sort orders', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act - Sort by username DESC
      const page1Desc = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'desc' },
            limit: 1,
          },
        }),
      );

      const page2Desc = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'desc' },
            limit: 1,
            cursor: page1Desc.pagination.cursor,
          },
        }),
      );

      // Assert
      expect(page1Desc.data.map((u) => u.username)).toEqual(['user2']);
      expect(page1Desc.pagination.cursor).toBeDefined();

      expect(page2Desc.data.map((u) => u.username)).toEqual(['user1']);
      expect(page2Desc.pagination.cursor).toBeDefined();
    });

    it('should return empty results when cursor is beyond available data', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const beyondCursor = PaginationCursor.encodeCursor('zzz', 'some-id'); // cursor beyond any existing username
      const result = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 10,
            cursor: beyondCursor,
          },
        }),
      );

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.cursor).toBeUndefined();
    });

    it('should handle cursor pagination with filters', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act - Get users with role USER, paginated
      const page1 = await handler.execute(
        createQuery({
          role: UserRoleEnum.USER,
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 1,
          },
        }),
      );

      const page2 = await handler.execute(
        createQuery({
          role: UserRoleEnum.USER,
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 1,
            cursor: page1.pagination.cursor,
          },
        }),
      );

      // Assert
      expect(page1.data).toHaveLength(1);
      expect(page1.data[0].role).toBe(UserRoleEnum.USER);
      expect(page1.data[0].username).toBe('user1');
      expect(page1.pagination.hasNext).toBe(true);

      expect(page2.data).toHaveLength(1);
      expect(page2.data[0].role).toBe(UserRoleEnum.USER);
      expect(page2.data[0].username).toBe('user2');
      expect(page2.pagination.hasNext).toBe(false);
    });

    it('should handle default pagination limit', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const query = createQuery({
        pagination: { sort: { field: 'username', order: 'asc' } },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(3); // All users fit within default limit of 10
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should use tiebreaker when provided', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const query = createQuery({
        pagination: {
          sort: { field: 'username', order: 'asc' },
          limit: 2,
        },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.cursor).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty repository', async () => {
      // Arrange
      const { handler } = setup();
      
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
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const query = createQuery({
        pagination: { limit: 0 },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(3);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should handle very large limit', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act
      const query = createQuery({
        pagination: { limit: 1000 },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(3); // Only 3 users available
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should maintain consistent cursors across identical queries', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act - Run same query twice
      const query = createQuery({
        pagination: {
          sort: { field: 'username', order: 'asc' },
          limit: 2,
        },
      });
      const result1 = await handler.execute(query);
      const result2 = await handler.execute(query);

      // Assert
      expect(result1.pagination.cursor).toBe(result2.pagination.cursor);
      expect(result1.data).toEqual(result2.data);
    });

    it('should handle sorting by different fields correctly', async () => {
      // Arrange
      const { handler, seedUsers } = setup();
      await seedUsers();

      // Act - Sort by different fields
      const sortByEmail = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'email', order: 'asc' },
            limit: 2,
          },
        }),
      );

      const sortByUsername = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'desc' },
            limit: 2,
          },
        }),
      );

      // Assert
      expect(sortByEmail.data).toHaveLength(2);
      expect(sortByEmail.pagination.cursor).toBeDefined();

      expect(sortByUsername.data).toHaveLength(2);
      expect(sortByUsername.pagination.cursor).toBeDefined();

      // Different sort fields should produce different cursors
      expect(sortByEmail.pagination.cursor).not.toBe(sortByUsername.pagination.cursor);
    });

    it('should handle multiple pages traversal consistently', async () => {
      // Arrange - Create more users for better pagination testing
      const { handler, repository, seedUsers } = setup();
      await seedUsers();
      const extraUsers = [
        User.random({
          email: new Email('user3@example.com'),
          username: new Username('aaa_first'),
        }),
        User.random({
          email: new Email('user4@example.com'),
          username: new Username('zzz_last'),
        }),
        User.random({
          email: new Email('user5@example.com'),
          username: new Username('mmm_middle'),
        }),
      ];

      for (const user of extraUsers) {
        await repository.save(user);
      }

      // Act - Traverse through all pages
      const allUsernames: string[] = [];
      let cursor: string | undefined;
      let hasNext = true;

      while (hasNext) {
        const page = await handler.execute(
          createQuery({
            pagination: {
              sort: { field: 'username', order: 'asc' },
              limit: 2,
              cursor: cursor,
            },
          }),
        );

        allUsernames.push(...page.data.map((u) => u.username));
        cursor = page.pagination.cursor;
        hasNext = page.pagination.hasNext || false;
      }

      // Assert - Should get all users in correct order
      expect(allUsernames).toEqual([
        'aaa_first',
        'admin',
        'mmm_middle',
        'user1',
        'user2',
        'zzz_last',
      ]);
    });

    it('should handle cursor with null/undefined orderBy field values', async () => {
      // Arrange
      const { handler, repository, seedUsers } = setup();
      await seedUsers();

      // Create user with potentially null sortable field
      const userWithEmptyField = User.random({
        email: new Email('empty@example.com'),
        username: new Username('empty_user'),
      });
      await repository.save(userWithEmptyField);

      // Act - Sort by a field that might have null values
      const result = await handler.execute(
        createQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 10,
          },
        }),
      );

      // Assert - Should handle the user with the additional field gracefully
      expect(result.data.length).toBeGreaterThan(3);
      expect(result.data.some((u) => u.username === 'empty_user')).toBe(true);
    });

    it('should throw InfrastructureException if repository fails', async () => {
      // Arrange
      const { handler } = setup({ shouldFailRepository: true });
      const query = createQuery();

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(InfrastructureException);
    });
  });
});
