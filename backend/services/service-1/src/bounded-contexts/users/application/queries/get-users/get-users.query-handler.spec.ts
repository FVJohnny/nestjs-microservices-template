import { GetUsersQueryHandler } from './get-users.query-handler';
import { GetUsersQuery } from './get-users.query';
import { UserInMemoryRepository } from '../../../infrastructure/repositories/in-memory/user-in-memory.repository';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Name } from '../../../domain/value-objects/name.vo';
import { UserProfile } from '../../../domain/value-objects/user-profile.vo';
import { UserStatus, UserStatusEnum } from '../../../domain/value-objects/user-status.vo';
import { UserRole, UserRoleEnum } from '../../../domain/value-objects/user-role.vo';

describe('GetUsersQueryHandler', () => {
  let handler: GetUsersQueryHandler;
  let repository: UserInMemoryRepository;

  beforeEach(() => {
    repository = new UserInMemoryRepository();
    handler = new GetUsersQueryHandler(repository);
  });

  const seedUsers = async () => {
    const users = [
      User.random({
        email: new Email('admin@example.com'),
        username: new Username('admin'),
        profile: new UserProfile(new Name('Admin'), new Name('User')),
        role: UserRole.admin(),
      }),
      User.random({
        email: new Email('user1@example.com'),
        username: new Username('user1'),
        profile: new UserProfile(new Name('John'), new Name('Doe')),
        role: UserRole.user(),
      }),
      User.random({
        email: new Email('user2@example.com'),
        username: new Username('user2'),
        profile: new UserProfile(new Name('Jane'), new Name('Smith')),
        role: UserRole.user(),
      }),
    ];

    for (const u of users) {
      await repository.save(u);
    }

    return users;
  };

  describe('Listing and filters', () => {
    it('should return all users when no filters provided', async () => {
      // Arrange
      const users = await seedUsers();

      // Act
      const query = new GetUsersQuery({});
      const result = await handler.execute(query);

      // Assert
      expect(result.users).toHaveLength(users.length);
      users.forEach(u => expect(result.users).toContainEqual(u.toValue()));
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
      const query = new GetUsersQuery({ status: UserStatusEnum.INACTIVE });
      const result = await handler.execute(query);

      // Assert
      expect(result.users).toHaveLength(1);
      expect(result.users[0].username).toBe(inactive.username.toValue());
    });

    it('should filter by email, username, firstName and lastName (contains)', async () => {
      // Arrange
      await seedUsers();

      // Act
      const queryByEmail = new GetUsersQuery({ email: 'admin@' });
      const resultsByEmail = await handler.execute(queryByEmail);

      const queryByUsername = new GetUsersQuery({ username: 'user1' });
      const resultsByUsername = await handler.execute(queryByUsername);

      const queryByFirstName = new GetUsersQuery({ firstName: 'Jane' });
      const resultsByFirstName = await handler.execute(queryByFirstName);

      const queryByLastName = new GetUsersQuery({ lastName: 'Doe' });
      const resultsByLastName = await handler.execute(queryByLastName);

      // Assert
      expect(resultsByEmail.users).toHaveLength(1);
      expect(resultsByEmail.users[0].username).toBe('admin');

      expect(resultsByUsername.users).toHaveLength(1);
      expect(resultsByUsername.users[0].username).toBe('user1');

      expect(resultsByFirstName.users).toHaveLength(1);
      expect(resultsByFirstName.users[0].username).toBe('user2');

      expect(resultsByLastName.users).toHaveLength(1);
      expect(resultsByLastName.users[0].username).toBe('user1');
    });
  });

  describe('Ordering and pagination', () => {
    it('should order by username ASC when orderBy is provided', async () => {
      // Arrange
      await seedUsers();

      // Act
      const query = new GetUsersQuery({ orderBy: 'username', orderType: 'asc' });
      const result = await handler.execute(query);

      // Assert
      expect(result.users.map(u => u.username)).toEqual(['admin', 'user1', 'user2']);
    });

    it('should apply limit and offset', async () => {
      // Arrange
      await seedUsers();

      // Act
      const page1 = await handler.execute(new GetUsersQuery({ orderBy: 'username', orderType: 'asc', limit: 2, offset: 0 }));
      const page2 = await handler.execute(new GetUsersQuery({ orderBy: 'username', orderType: 'asc', limit: 2, offset: 2 }));

      // Assert
      expect(page1.users.map(u => u.username)).toEqual(['admin', 'user1']);
      expect(page2.users.map(u => u.username)).toEqual(['user2']);
    });
  });

  describe('Role filtering', () => {
    it('should return only admins when role=ADMIN', async () => {
      // Arrange
      await seedUsers();

      // Act
      const query = new GetUsersQuery({ role: UserRoleEnum.ADMIN });
      const onlyAdmins = await handler.execute(query);

      // Assert
      expect(onlyAdmins.users).toHaveLength(1);
      expect(onlyAdmins.users[0].role).toBe(UserRoleEnum.ADMIN);
    });

    it('should return only users when role=USER', async () => {
      // Arrange
      await seedUsers();

      // Act
      const query = new GetUsersQuery({ role: UserRoleEnum.USER });
      const onlyUsers = await handler.execute(query);

      // Assert
      expect(onlyUsers.users).toHaveLength(2);
      expect(new Set(onlyUsers.users.map(u => u.role))).toEqual(new Set([UserRoleEnum.USER]));
    });
  });
});
