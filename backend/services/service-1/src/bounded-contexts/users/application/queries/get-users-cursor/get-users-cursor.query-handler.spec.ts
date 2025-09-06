import { GetUsersCursorQueryHandler } from './get-users-cursor.query-handler';
import { GetUsersCursorQuery } from './get-users-cursor.query';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Name } from '../../../domain/value-objects/name.vo';
import { UserProfile } from '../../../domain/value-objects/user-profile.vo';
import {
  UserStatus,
  UserStatusEnum,
} from '../../../domain/value-objects/user-status.vo';
import { UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import { UserTestFactory } from '../../../test-utils';

describe('GetUsersCursorQueryHandler', () => {
  let handler: GetUsersCursorQueryHandler;
  let repository: UserInMemoryRepository;

  beforeEach(() => {
    repository = new UserInMemoryRepository();
    handler = new GetUsersCursorQueryHandler(repository);
  });

  const seedUsers = async () => {
    const users = UserTestFactory.createStandardTestUsers();
    await UserTestFactory.saveUsersToRepository(repository, users);
    return users;
  };

  describe('Listing and filters', () => {
    it('should return all users when no filters provided', async () => {
      // Arrange
      const users = await seedUsers();

      // Act
      const query = new GetUsersCursorQuery({});
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(users.length);
      users.forEach((u) => expect(result.data).toContainEqual(u.toValue()));
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should filter by status when provided', async () => {
      // Arrange
      await seedUsers();
      const inactive = User.random({
        email: new Email('inactive2@example.com'),
        username: new Username('inactive2'),
        profile: new UserProfile(new Name('Idle'), new Name('Two')),
        status: UserStatus.inactive(),
      });
      await repository.save(inactive);

      // Act
      const query = new GetUsersCursorQuery({
        status: UserStatusEnum.INACTIVE,
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].username).toBe(inactive.username.toValue());
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should filter by email, username, firstName and lastName (contains)', async () => {
      // Arrange
      await seedUsers();

      // Act
      const queryByEmail = new GetUsersCursorQuery({ email: 'admin@' });
      const resultsByEmail = await handler.execute(queryByEmail);

      const queryByUsername = new GetUsersCursorQuery({ username: 'user1' });
      const resultsByUsername = await handler.execute(queryByUsername);

      const queryByFirstName = new GetUsersCursorQuery({ firstName: 'Jane' });
      const resultsByFirstName = await handler.execute(queryByFirstName);

      const queryByLastName = new GetUsersCursorQuery({ lastName: 'Doe' });
      const resultsByLastName = await handler.execute(queryByLastName);

      // Assert
      expect(resultsByEmail.data).toHaveLength(1);
      expect(resultsByEmail.data[0].username).toBe('admin');

      expect(resultsByUsername.data).toHaveLength(1);
      expect(resultsByUsername.data[0].username).toBe('user1');

      expect(resultsByFirstName.data).toHaveLength(1);
      expect(resultsByFirstName.data[0].username).toBe('user2');

      expect(resultsByLastName.data).toHaveLength(1);
      expect(resultsByLastName.data[0].username).toBe('user1');
    });
  });

  describe('Role filtering', () => {
    it('should return only admins when role=ADMIN', async () => {
      // Arrange
      await seedUsers();

      // Act
      const query = new GetUsersCursorQuery({ role: UserRoleEnum.ADMIN });
      const onlyAdmins = await handler.execute(query);

      // Assert
      expect(onlyAdmins.data).toHaveLength(1);
      expect(onlyAdmins.data[0].role).toBe(UserRoleEnum.ADMIN);
      expect(onlyAdmins.pagination.hasNext).toBe(false);
    });

    it('should return only users when role=USER', async () => {
      // Arrange
      await seedUsers();

      // Act
      const query = new GetUsersCursorQuery({ role: UserRoleEnum.USER });
      const onlyUsers = await handler.execute(query);

      // Assert
      expect(onlyUsers.data).toHaveLength(2);
      expect(new Set(onlyUsers.data.map((u) => u.role))).toEqual(
        new Set([UserRoleEnum.USER]),
      );
      expect(onlyUsers.pagination.hasNext).toBe(false);
    });
  });

  describe('Cursor pagination', () => {
    it('should order by username ASC when orderBy is provided', async () => {
      // Arrange
      await seedUsers();

      // Act
      const query = new GetUsersCursorQuery({
        pagination: { sort: { field: 'username', order: 'asc' } },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data.map((u) => u.username)).toEqual([
        'admin',
        'user1',
        'user2',
      ]);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should apply limit and return cursor for pagination', async () => {
      // Arrange
      await seedUsers();

      // Act
      const page1 = await handler.execute(
        new GetUsersCursorQuery({
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
      expect(page1.pagination.cursor).toBe('user1'); // cursor should be the username of the last item
    });

    it('should use cursor to get next page', async () => {
      // Arrange
      await seedUsers();

      // Act - Get first page
      const page1 = await handler.execute(
        new GetUsersCursorQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 2,
          },
        }),
      );

      // Act - Get second page using cursor
      const page2 = await handler.execute(
        new GetUsersCursorQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 2,
            after: page1.pagination.cursor,
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
      await seedUsers();

      // Act - Sort by username DESC
      const page1Desc = await handler.execute(
        new GetUsersCursorQuery({
          pagination: {
            sort: { field: 'username', order: 'desc' },
            limit: 1,
          },
        }),
      );

      const page2Desc = await handler.execute(
        new GetUsersCursorQuery({
          pagination: {
            sort: { field: 'username', order: 'desc' },
            limit: 1,
            after: page1Desc.pagination.cursor,
          },
        }),
      );

      // Assert
      expect(page1Desc.data.map((u) => u.username)).toEqual(['user2']);
      expect(page1Desc.pagination.cursor).toBe('user2');

      expect(page2Desc.data.map((u) => u.username)).toEqual(['user1']);
      expect(page2Desc.pagination.cursor).toBe('user1');
    });

    it('should return empty results when cursor is beyond available data', async () => {
      // Arrange
      await seedUsers();

      // Act
      const result = await handler.execute(
        new GetUsersCursorQuery({
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 10,
            after: 'zzz', // cursor beyond any existing username
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
      await seedUsers();

      // Act - Get users with role USER, paginated
      const page1 = await handler.execute(
        new GetUsersCursorQuery({
          role: UserRoleEnum.USER,
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 1,
          },
        }),
      );

      const page2 = await handler.execute(
        new GetUsersCursorQuery({
          role: UserRoleEnum.USER,
          pagination: {
            sort: { field: 'username', order: 'asc' },
            limit: 1,
            after: page1.pagination.cursor,
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
      await seedUsers();

      // Act
      const query = new GetUsersCursorQuery({
        pagination: { sort: { field: 'username', order: 'asc' } },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(3); // All users fit within default limit of 10
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should use tiebreaker when provided', async () => {
      // Arrange
      await seedUsers();

      // Act
      const query = new GetUsersCursorQuery({
        pagination: {
          sort: { field: 'username', order: 'asc' },
          limit: 2,
          tieBreakerId: 'id',
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
      // Act
      const query = new GetUsersCursorQuery({});
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.cursor).toBeUndefined();
    });

    it('should handle limit of 0', async () => {
      // Arrange
      await seedUsers();

      // Act
      const query = new GetUsersCursorQuery({
        pagination: { limit: 0 },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.cursor).toBeUndefined();
    });

    it('should handle very large limit', async () => {
      // Arrange
      await seedUsers();

      // Act
      const query = new GetUsersCursorQuery({
        pagination: { limit: 1000 },
      });
      const result = await handler.execute(query);

      // Assert
      expect(result.data).toHaveLength(3); // Only 3 users available
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should maintain consistent cursors across identical queries', async () => {
      // Arrange
      await seedUsers();

      // Act - Run same query twice
      const query = new GetUsersCursorQuery({
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
      await seedUsers();

      // Act - Sort by different fields
      const sortByEmail = await handler.execute(
        new GetUsersCursorQuery({
          pagination: {
            sort: { field: 'email', order: 'asc' },
            limit: 2,
          },
        }),
      );

      const sortByUsername = await handler.execute(
        new GetUsersCursorQuery({
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
      expect(sortByEmail.pagination.cursor).not.toBe(
        sortByUsername.pagination.cursor,
      );
    });

    it('should handle multiple pages traversal consistently', async () => {
      // Arrange - Create more users for better pagination testing
      await seedUsers();
      const extraUsers = [
        User.random({
          email: new Email('user3@example.com'),
          username: new Username('aaa_first'),
          profile: new UserProfile(new Name('AAA'), new Name('First')),
        }),
        User.random({
          email: new Email('user4@example.com'),
          username: new Username('zzz_last'),
          profile: new UserProfile(new Name('ZZZ'), new Name('Last')),
        }),
        User.random({
          email: new Email('user5@example.com'),
          username: new Username('mmm_middle'),
          profile: new UserProfile(new Name('MMM'), new Name('Middle')),
        }),
      ];

      for (const user of extraUsers) {
        await repository.save(user);
      }

      // Act - Traverse through all pages
      const allUsernames = [];
      let cursor: string | undefined;
      let hasNext = true;

      while (hasNext) {
        const page = await handler.execute(
          new GetUsersCursorQuery({
            pagination: {
              sort: { field: 'username', order: 'asc' },
              limit: 2,
              after: cursor,
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
      await seedUsers();

      // Create user with potentially null sortable field
      const userWithEmptyField = User.random({
        email: new Email('empty@example.com'),
        username: new Username('empty_user'),
        profile: new UserProfile(new Name('Empty'), new Name('User')),
      });
      await repository.save(userWithEmptyField);

      // Act - Sort by a field that might have null values
      const result = await handler.execute(
        new GetUsersCursorQuery({
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
  });
});
