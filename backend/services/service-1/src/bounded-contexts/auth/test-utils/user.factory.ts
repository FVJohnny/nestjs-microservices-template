import { User } from '../domain/entities/user/user.entity';
import { Email } from '../domain/value-objects/email.vo';
import { Username } from '../domain/value-objects/username.vo';
import { UserRole } from '../domain/value-objects/user-role.vo';
import { UserStatus } from '../domain/value-objects/user-status.vo';

/**
 * Test user factory for creating consistent lists of test users
 * across all test files in the users bounded context.
 *
 * This factory focuses on creating predefined lists of users
 * that are commonly used in tests, avoiding duplication.
 */
export class UserTestFactory {
  /**
   * Creates a standard set of test users commonly used across tests
   * @returns Array of 3 users: 1 admin and 2 regular users
   */
  static createStandardTestUsers(): User[] {
    return [
      User.random({
        email: new Email('admin@example.com'),
        username: new Username('admin'),
        role: UserRole.admin(),
      }),
      User.random({
        email: new Email('user1@example.com'),
        username: new Username('user1'),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('user2@example.com'),
        username: new Username('user2'),
        role: UserRole.user(),
      }),
    ];
  }

  /**
   * Creates multiple random users with sequential numbering
   * @param count Number of users to create
   * @param baseProps Optional base properties to apply to all users
   */
  static createRandomUsers(
    count: number,
    baseProps?: {
      role?: UserRole;
      status?: UserStatus;
      domain?: string;
    },
  ): User[] {
    const users: User[] = [];
    const domain = baseProps?.domain ?? 'example.com';

    for (let i = 0; i < count; i++) {
      const user = User.random({
        email: new Email(`user${i}@${domain}`),
        username: new Username(`user${i}`),
        role: baseProps?.role,
        status: baseProps?.status,
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Creates users for pagination testing
   * @param total Total number of users to create
   * @param options Additional options for the users
   */
  static createUsersForPagination(
    total: number,
    options?: {
      prefix?: string;
      domain?: string;
      role?: UserRole;
    },
  ): User[] {
    const prefix = options?.prefix ?? 'page';
    const domain = options?.domain ?? 'example.com';
    const users: User[] = [];

    for (let i = 0; i < total; i++) {
      users.push(
        User.random({
          email: new Email(`${prefix}${i}@${domain}`),
          username: new Username(`${prefix}${i}`),
          role: options?.role ?? (i === 0 ? UserRole.admin() : UserRole.user()),
          status: UserStatus.active(),
        }),
      );
    }

    return users;
  }

  /**
   * Creates users for filtering tests with predictable data
   */
  static createUsersForFiltering(): User[] {
    return [
      User.random({
        email: new Email('alice@example.com'),
        username: new Username('alice'),
        role: UserRole.admin(),
      }),
      User.random({
        email: new Email('bob@example.com'),
        username: new Username('bob'),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('charlie@example.com'),
        username: new Username('charlie'),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('diana@example.com'),
        username: new Username('diana'),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('edward@example.com'),
        username: new Username('edward'),
        role: UserRole.user(),
      }),
    ];
  }

  /**
   * Helper to save multiple users to a repository
   * @param repository The repository to save to
   * @param users The users to save
   */
  static async saveUsersToRepository(
    repository: { save(user: User): Promise<void> },
    users: User[],
  ): Promise<void> {
    for (const user of users) {
      await repository.save(user);
    }
  }
}
