import { User } from '../domain/entities/user.entity';
import { Email } from '../domain/value-objects/email.vo';
import { Username } from '../domain/value-objects/username.vo';
import { Name } from '../domain/value-objects/name.vo';
import { UserProfile } from '../domain/value-objects/user-profile.vo';
import { UserRole, UserRoleEnum } from '../domain/value-objects/user-role.vo';
import { UserStatus, UserStatusEnum } from '../domain/value-objects/user-status.vo';

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
        profile: new UserProfile(
          new Name('Admin'),
          new Name('User')
        ),
        role: UserRole.admin(),
      }),
      User.random({
        email: new Email('user1@example.com'),
        username: new Username('user1'),
        profile: new UserProfile(
          new Name('John'),
          new Name('Doe')
        ),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('user2@example.com'),
        username: new Username('user2'),
        profile: new UserProfile(
          new Name('Jane'),
          new Name('Smith')
        ),
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
    }
  ): User[] {
    const users: User[] = [];
    const domain = baseProps?.domain ?? 'example.com';
    
    for (let i = 0; i < count; i++) {
      const user = User.random({
        email: new Email(`user${i}@${domain}`),
        username: new Username(`user${i}`),
        profile: new UserProfile(
          new Name(`FirstName${i}`),
          new Name(`LastName${i}`)
        ),
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
    }
  ): User[] {
    const prefix = options?.prefix ?? 'page';
    const domain = options?.domain ?? 'example.com';
    const users: User[] = [];
    
    for (let i = 0; i < total; i++) {
      users.push(
        User.random({
          email: new Email(`${prefix}${i}@${domain}`),
          username: new Username(`${prefix}${i}`),
          profile: new UserProfile(
            new Name(`First${i}`),
            new Name(`Last${i}`)
          ),
          role: options?.role ?? (i === 0 ? UserRole.admin() : UserRole.user()),
          status: UserStatus.active(),
        })
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
        profile: new UserProfile(new Name('Alice'), new Name('Anderson')),
        role: UserRole.admin(),
      }),
      User.random({
        email: new Email('bob@example.com'),
        username: new Username('bob'),
        profile: new UserProfile(new Name('Bob'), new Name('Brown')),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('charlie@example.com'),
        username: new Username('charlie'),
        profile: new UserProfile(new Name('Charlie'), new Name('Chen')),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('diana@example.com'),
        username: new Username('diana'),
        profile: new UserProfile(new Name('Diana'), new Name('Davis')),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('edward@example.com'),
        username: new Username('edward'),
        profile: new UserProfile(new Name('Edward'), new Name('Evans')),
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
    users: User[]
  ): Promise<void> {
    for (const user of users) {
      await repository.save(user);
    }
  }

  /**
   * Creates users with specific email patterns for testing email filters
   */
  static createUsersWithEmailPatterns(): User[] {
    return [
      this.createUser('gmail', 'Gmail', 'User', { email: 'user@gmail.com' }),
      this.createUser('yahoo', 'Yahoo', 'User', { email: 'user@yahoo.com' }),
      this.createUser('hotmail', 'Hotmail', 'User', { email: 'user@hotmail.com' }),
      this.createUser('company', 'Company', 'User', { email: 'user@company.co.uk' }),
      this.createUser('edu', 'Education', 'User', { email: 'student@university.edu' }),
    ];
  }

  /**
   * Creates users with different statuses for status-based testing
   */
  static createUsersWithStatuses(): User[] {
    return [
      this.createUser('active1', 'Active', 'One', { status: UserStatus.active() }),
      this.createUser('active2', 'Active', 'Two', { status: UserStatus.active() }),
      this.createUser('inactive1', 'Inactive', 'One', { status: UserStatus.inactive() }),
      this.createUser('inactive2', 'Inactive', 'Two', { status: UserStatus.inactive() }),
    ];
  }

  /**
   * Creates users for testing name-based searches and filters
   * Includes users with names starting with the same letters
   */
  static createUsersForNameFiltering(): User[] {
    return [
      // J names for testing CONTAINS 'J'
      this.createUser('john', 'John', 'Johnson'),
      this.createUser('jane', 'Jane', 'Jackson'),
      this.createUser('julia', 'Julia', 'Jones'),
      this.createUser('james', 'James', 'Jordan'),
      // Other names
      this.createUser('alice', 'Alice', 'Anderson'),
      this.createUser('bob', 'Bob', 'Brown'),
      this.createUser('carol', 'Carol', 'Clark'),
    ];
  }
}