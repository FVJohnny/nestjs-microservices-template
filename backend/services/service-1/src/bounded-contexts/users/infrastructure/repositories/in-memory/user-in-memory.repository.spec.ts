import { UserInMemoryRepository } from './user-in-memory.repository';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Name } from '../../../domain/value-objects/name.vo';
import { UserRole, UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import { UserStatus, UserStatusEnum } from '../../../domain/value-objects/user-status.vo';
import {
  Criteria,
  Filters,
  Filter,
  FilterField,
  FilterOperator,
  FilterValue,
  Order,
  OrderBy,
  OrderType,
  OrderTypes,
  Operator,
  PaginationOffset,
} from '@libs/nestjs-common';
import { UserProfile } from '../../../domain/value-objects/user-profile.vo';
import { UserTestFactory } from '../../../test-utils';

describe('UserInMemoryRepository', () => {
  let repository: UserInMemoryRepository;

  beforeEach(() => {
    repository = new UserInMemoryRepository();
  });

  describe('Basic CRUD Operations', () => {
    describe('save', () => {
      it('should save a new user successfully', async () => {
        // Arrange
        const user = User.random();

        // Act
        await repository.save(user);

        // Assert
        const savedUser = await repository.findById(user.id);
        expect(savedUser).not.toBeNull();
        expect(savedUser?.equals(user)).toBe(true);
      });

      it('should update an existing user when saving with same id', async () => {
        // Arrange
        const user = User.random();
        await repository.save(user);

        // Modify user
        user.updateProfile({
          firstName: new Name('Updated'),
          lastName: new Name('Name'),
        });

        // Act
        await repository.save(user);

        // Assert
        const savedUser = await repository.findById(user.id);
        expect(savedUser!.profile.firstName.toValue()).toBe('Updated');
        expect(savedUser!.profile.lastName.toValue()).toBe('Name');

        // Should still be only one user
        const allUsers = await repository.findAll();
        expect(allUsers).toHaveLength(1);
      });

      it('should save multiple users', async () => {
        // Arrange
        const users = UserTestFactory.createStandardTestUsers();

        // Act
        await UserTestFactory.saveUsersToRepository(repository, users);

        // Assert
        const allUsers = await repository.findAll();
        expect(allUsers).toHaveLength(users.length);
        users.forEach((user) => {
          const found = allUsers.find((u) => u.id === user.id);
          expect(found).toBeDefined();
          expect(found?.equals(user)).toBe(true);
        });
      });
    });

    describe('findById', () => {
      it('should return user when it exists', async () => {
        // Arrange
        const user = User.random();
        await repository.save(user);

        // Act
        const result = await repository.findById(user.id);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.equals(user)).toBe(true);
      });

      it('should return null when user does not exist', async () => {
        // Act
        const result = await repository.findById('non-existent-id');

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('findByEmail', () => {
      it('should return user when email exists', async () => {
        // Arrange
        const user = User.random({ email: new Email('test@example.com') });
        await repository.save(user);

        // Act
        const result = await repository.findByEmail(user.email);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.equals(user)).toBe(true);
      });

      it('should return null when email does not exist', async () => {
        // Act
        const result = await repository.findByEmail(new Email('nonexistent@example.com'));

        // Assert
        expect(result).toBeNull();
      });

      it('should handle email matching correctly', async () => {
        // Arrange
        const user = User.random({ email: new Email('test@example.com') });
        await repository.save(user);

        // Act
        const result = await repository.findByEmail(user.email);

        // Assert
        expect(result).not.toBeNull();
        expect(result!.equals(user)).toBe(true);
      });
    });

    describe('findByUsername', () => {
      it('should return user when username exists', async () => {
        // Arrange
        const user = User.random({ username: new Username('testuser') });
        await repository.save(user);

        // Act
        const result = await repository.findByUsername(new Username('testuser'));

        // Assert
        expect(result).not.toBeNull();
        expect(result!.equals(user)).toBe(true);
      });

      it('should return null when username does not exist', async () => {
        // Act
        const result = await repository.findByUsername(new Username('nonexistentuser'));

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('existsByEmail', () => {
      it('should return true when email exists', async () => {
        // Arrange
        const user = User.random({ email: new Email('existing@example.com') });
        await repository.save(user);

        // Act
        const result = await repository.existsByEmail(new Email('existing@example.com'));

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when email does not exist', async () => {
        // Act
        const result = await repository.existsByEmail(new Email('nonexistent@example.com'));

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('existsByUsername', () => {
      it('should return true when username exists', async () => {
        // Arrange
        const user = User.random({ username: new Username('existinguser') });
        await repository.save(user);

        // Act
        const result = await repository.existsByUsername(new Username('existinguser'));

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when username does not exist', async () => {
        // Act
        const result = await repository.existsByUsername(new Username('nonexistentuser'));

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('exists', () => {
      it('should return true when user exists', async () => {
        // Arrange
        const user = User.random();
        await repository.save(user);

        // Act
        const result = await repository.exists(user.id);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user does not exist', async () => {
        // Act
        const result = await repository.exists('non-existent-id');

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('remove', () => {
      it('should remove an existing user', async () => {
        // Arrange
        const user = User.random();
        await repository.save(user);
        expect(await repository.exists(user.id)).toBe(true);

        // Act
        await repository.remove(user.id);

        // Assert
        expect(await repository.exists(user.id)).toBe(false);
        expect(await repository.findById(user.id)).toBeNull();
      });

      it('should handle removal of non-existent user gracefully', async () => {
        // Act & Assert - Should not throw
        await expect(repository.remove('non-existent-id')).resolves.not.toThrow();
      });
    });

    describe('findAll', () => {
      it('should return all users', async () => {
        // Arrange
        const testUsers = UserTestFactory.createStandardTestUsers();
        await UserTestFactory.saveUsersToRepository(repository, testUsers);

        // Act
        const results = await repository.findAll();

        // Assert
        expect(results).toHaveLength(testUsers.length);
        testUsers.forEach((testUser) => {
          const result = results.find((r) => r.id === testUser.id);
          expect(result).toBeDefined();
          expect(result!.equals(testUser)).toBe(true);
        });
      });

      it('should return empty array when no users exist', async () => {
        // Act
        const result = await repository.findAll();

        // Assert
        expect(result).toHaveLength(0);
        expect(result).toEqual([]);
      });
    });
  });

  describe('Criteria-based Operations', () => {
    let testUsers: User[] = [];

    beforeEach(async () => {
      testUsers = UserTestFactory.createStandardTestUsers();
      await UserTestFactory.saveUsersToRepository(repository, testUsers);
    });

    describe('findByCriteria - Basic Filtering', () => {
      it('should return all users when no filters applied', async () => {
        // Arrange
        const criteria = new Criteria();

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(testUsers.length);
      });

      it('should filter by email (EQUAL)', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('email'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue('admin@example.com'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].email.toValue()).toBe('admin@example.com');
      });

      it('should filter by username (EQUAL)', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('username'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue('admin'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].username.toValue()).toBe('admin');
      });

      it('should filter by firstName (EQUAL)', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('profile.firstName'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue('John'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].profile.firstName.toValue()).toBe('John');
      });

      it('should filter by lastName (EQUAL)', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('profile.lastName'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue('Smith'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].profile.lastName.toValue()).toBe('Smith');
      });

      it('should filter by status (EQUAL)', async () => {
        // Arrange
        const inactiveUser = User.random({ status: UserStatus.inactive() });
        await repository.save(inactiveUser);

        const filter = new Filter(
          new FilterField('status'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue(UserStatusEnum.INACTIVE),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].status.toValue()).toBe(UserStatusEnum.INACTIVE);
      });

      it('should filter by role (EQUAL)', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('role'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue('admin'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].role.toValue()).toBe(UserRoleEnum.ADMIN);
      });
    });

    describe('findByCriteria - Advanced Filtering', () => {
      it('should filter with NOT_EQUAL operator', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('username'),
          new FilterOperator(Operator.NOT_EQUAL),
          new FilterValue('admin'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(2); // Should return users that are not admin
        expect(result.data.every((user) => user.username.toValue() !== 'admin')).toBe(true);
      });

      it('should filter with CONTAINS operator (case-insensitive)', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('email'),
          new FilterOperator(Operator.CONTAINS),
          new FilterValue('EXAMPLE'), // uppercase
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(3); // All test users have example.com email
        expect(
          result.data.every((user) => user.email.toValue().toLowerCase().includes('example')),
        ).toBe(true);
      });

      it('should filter with NOT_CONTAINS operator', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('profile.firstName'),
          new FilterOperator(Operator.NOT_CONTAINS),
          new FilterValue('John'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(2); // Admin and Jane
        expect(
          result.data.every(
            (user) => !user.profile.firstName.toValue().toLowerCase().includes('john'),
          ),
        ).toBe(true);
      });

      it('should filter with date fields using GT operator', async () => {
        // Arrange
        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
        const filter = new Filter(
          new FilterField('createdAt'),
          new FilterOperator(Operator.GT),
          new FilterValue(pastDate.toISOString()),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(3); // All test users were created today
        expect(result.data.every((user) => user.createdAt > pastDate)).toBe(true);
      });

      it('should filter with date fields using LT operator', async () => {
        // Arrange
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
        const filter = new Filter(
          new FilterField('createdAt'),
          new FilterOperator(Operator.LT),
          new FilterValue(futureDate.toISOString()),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(3); // All test users were created before tomorrow
        expect(result.data.every((user) => user.createdAt < futureDate)).toBe(true);
      });

      it('should combine multiple filters (AND logic)', async () => {
        // Arrange
        const filters = [
          new Filter(
            new FilterField('profile.firstName'),
            new FilterOperator(Operator.CONTAINS),
            new FilterValue('J'), // Should match John and Jane
          ),
          new Filter(
            new FilterField('profile.lastName'),
            new FilterOperator(Operator.EQUAL),
            new FilterValue('Doe'), // Should match only John Doe
          ),
        ];
        const criteria = new Criteria({
          filters: new Filters(filters),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].profile.firstName.toValue()).toBe('John');
        expect(result.data[0].profile.lastName.toValue()).toBe('Doe');
      });

      it('should return empty array when no matches found', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('email'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue('nonexistent@example.com'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(0);
      });
    });

    describe('findByCriteria - Sorting', () => {
      it('should sort by firstName ascending', async () => {
        // Arrange
        const order = new Order(new OrderBy('profile.firstName'), new OrderType(OrderTypes.ASC));
        const criteria = new Criteria({ order });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(3);
        expect(result.data[0].profile.firstName.toValue()).toBe('Admin');
        expect(result.data[1].profile.firstName.toValue()).toBe('Jane');
        expect(result.data[2].profile.firstName.toValue()).toBe('John');
      });

      it('should sort by firstName descending', async () => {
        // Arrange
        const order = new Order(new OrderBy('profile.firstName'), new OrderType(OrderTypes.DESC));
        const criteria = new Criteria({ order });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(3);
        expect(result.data[0].profile.firstName.toValue()).toBe('John');
        expect(result.data[1].profile.firstName.toValue()).toBe('Jane');
        expect(result.data[2].profile.firstName.toValue()).toBe('Admin');
      });

      it('should sort by username ascending', async () => {
        // Arrange
        const order = new Order(new OrderBy('username'), new OrderType(OrderTypes.ASC));
        const criteria = new Criteria({ order });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(3);
        expect(result.data[0].username.toValue()).toBe('admin');
        expect(result.data[1].username.toValue()).toBe('user1');
        expect(result.data[2].username.toValue()).toBe('user2');
      });

      it('should handle sorting with null/undefined values', async () => {
        // Arrange - Create user with lastLoginAt undefined
        const userWithoutLogin = User.random({
          username: new Username('nologin'),
        });
        await repository.save(userWithoutLogin);

        const order = new Order(new OrderBy('lastLoginAt'), new OrderType(OrderTypes.ASC));
        const criteria = new Criteria({ order });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(4);
        // Users with undefined lastLoginAt should be sorted to the end
        expect(result.data[result.data.length - 1].lastLoginAt).toBeUndefined();
      });
    });

    describe('findByCriteria - Pagination', () => {
      it('should apply limit', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(2, 0, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(2);
      });

      it('should apply offset', async () => {
        // Arrange
        const allUsers = await repository.findAll();
        const criteria = new Criteria({
          pagination: new PaginationOffset(0, 1, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(allUsers.length - 1);
      });

      it('should combine limit and offset', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(1, 1, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1);
      });

      it('should handle offset larger than collection size', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(0, 10, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(0);
      });

      it('should handle limit larger than remaining items', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(10, 2, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1); // Only 1 item remaining after offset 2
      });
    });

    describe('findByCriteria - withTotal functionality', () => {
      it('should return null total when withTotal is false (default)', async () => {
        // Arrange
        const criteria = new Criteria();

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(3);
        expect(result.total).toBeNull();
      });

      it('should return total count when withTotal is true', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(0, 0, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(3);
        expect(result.total).toBe(3);
      });

      it('should return correct total with pagination (limit only)', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(2, 0, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(2); // Limited results
        expect(result.total).toBe(3); // Total available records
      });

      it('should return correct total with pagination (offset only)', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(0, 1, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(2); // Remaining after offset
        expect(result.total).toBe(3); // Total available records
      });

      it('should return correct total with pagination (limit and offset)', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(1, 1, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1); // Limited and offset results
        expect(result.total).toBe(3); // Total available records
      });

      it('should return correct total with filters and pagination', async () => {
        // Arrange - Filter for users with firstName containing 'J' (John and Jane)
        const filter = new Filter(
          new FilterField('profile.firstName'),
          new FilterOperator(Operator.CONTAINS),
          new FilterValue('J'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
          pagination: new PaginationOffset(1, 0, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1); // Limited to 1
        expect(result.total).toBe(2); // Total matching the filter (John and Jane)
      });

      it('should return zero total when no records match filter', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('email'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue('nonexistent@example.com'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
          pagination: new PaginationOffset(0, 0, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
      });

      it('should return correct total with sorting and pagination', async () => {
        // Arrange
        const order = new Order(new OrderBy('profile.firstName'), new OrderType(OrderTypes.ASC));
        const criteria = new Criteria({
          order,
          pagination: new PaginationOffset(2, 1, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(2); // Limited and offset results
        expect(result.total).toBe(3); // Total available records (ignoring pagination)
      });

      it('should handle edge case where offset equals total records', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(0, 3, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(0); // No results after offset
        expect(result.total).toBe(3); // Total available records
      });

      it('should handle edge case where offset exceeds total records', async () => {
        // Arrange
        const criteria = new Criteria({
          pagination: new PaginationOffset(10, 10, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(0); // No results
        expect(result.total).toBe(3); // Total available records
      });

      it('should work correctly with complex filters and withTotal', async () => {
        // Arrange - Create additional test user to have more data
        const extraUser = User.random({
          email: new Email('extra@example.com'),
          username: new Username('extrauser'),
          profile: new UserProfile(new Name('Julia'), new Name('Extra')),
          role: UserRole.user(),
        });
        await repository.save(extraUser);

        // Filter for users with firstName containing 'J' (John, Jane, and Julia)
        const filter = new Filter(
          new FilterField('profile.firstName'),
          new FilterOperator(Operator.CONTAINS),
          new FilterValue('J'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
          pagination: new PaginationOffset(2, 1, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(2); // Limited to 2, offset by 1
        expect(result.total).toBe(3); // Total matching the filter (John, Jane, Julia)
      });

      it('should work with NOT_EQUAL filter and withTotal', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('role'),
          new FilterOperator(Operator.NOT_EQUAL),
          new FilterValue('admin'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
          pagination: new PaginationOffset(1, 0, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1); // Limited to 1
        expect(result.total).toBe(2); // Total users that are not admin
      });

      it('should work with CONTAINS filter and withTotal', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('email'),
          new FilterOperator(Operator.CONTAINS),
          new FilterValue('example.com'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
          pagination: new PaginationOffset(1, 1, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1); // Limited to 1, offset by 1
        expect(result.total).toBe(3); // All test users have example.com emails
      });
    });

    describe('findByCriteria - Complex Scenarios', () => {
      it('should combine filters, sorting, and pagination', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('profile.firstName'),
          new FilterOperator(Operator.CONTAINS),
          new FilterValue('J'), // Should match John and Jane
        );
        const order = new Order(new OrderBy('profile.firstName'), new OrderType(OrderTypes.DESC));
        const criteria = new Criteria({
          filters: new Filters([filter]),
          order,
          pagination: new PaginationOffset(1, 0, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.data[0].profile.firstName.toValue()).toBe('John'); // John comes first in DESC order
      });

      it('should handle empty results with all criteria', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('email'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue('nonexistent@example.com'),
        );
        const order = new Order(new OrderBy('profile.firstName'), new OrderType(OrderTypes.ASC));
        const criteria = new Criteria({
          filters: new Filters([filter]),
          order,
          pagination: new PaginationOffset(10, 0, true),
        });

        // Act
        const result = await repository.findByCriteria(criteria);

        // Assert
        expect(result.data).toHaveLength(0);
      });
    });

    describe('countByCriteria', () => {
      it('should count all users when no filters applied', async () => {
        // Arrange
        const criteria = new Criteria();

        // Act
        const result = await repository.countByCriteria(criteria);

        // Assert
        expect(result).toBe(3);
      });

      it('should count filtered users', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('profile.firstName'),
          new FilterOperator(Operator.CONTAINS),
          new FilterValue('J'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.countByCriteria(criteria);

        // Assert
        expect(result).toBe(2); // John and Jane
      });

      it('should return 0 when no matches found', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('email'),
          new FilterOperator(Operator.EQUAL),
          new FilterValue('nonexistent@example.com'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
        });

        // Act
        const result = await repository.countByCriteria(criteria);

        // Assert
        expect(result).toBe(0);
      });

      it('should ignore pagination in count', async () => {
        // Arrange
        const filter = new Filter(
          new FilterField('profile.firstName'),
          new FilterOperator(Operator.CONTAINS),
          new FilterValue('J'),
        );
        const criteria = new Criteria({
          filters: new Filters([filter]),
          pagination: new PaginationOffset(1, 1),
        });

        // Act
        const count = await repository.countByCriteria(criteria);
        const results = await repository.findByCriteria(criteria);

        // Assert
        expect(count).toBe(2); // Total matching records
        expect(results.data).toHaveLength(1); // After pagination
      });
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all user properties through save/load cycle', async () => {
      // Arrange
      const originalUser = User.random({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        profile: new UserProfile(new Name('Test'), new Name('User')),
        role: UserRole.admin(),
      });

      // Modify some properties
      originalUser.updateProfile({
        firstName: new Name('Modified'),
        lastName: new Name('Testuser'),
      });

      // Act
      await repository.save(originalUser);
      const loadedUser = await repository.findById(originalUser.id);

      // Assert
      expect(loadedUser).not.toBeNull();
      expect(loadedUser!.id).toBe(originalUser.id);
      expect(loadedUser!.email.toValue()).toBe(originalUser.email.toValue());
      expect(loadedUser!.username.toValue()).toBe(originalUser.username.toValue());
      expect(loadedUser!.profile.firstName.toValue()).toBe('Modified');
      expect(loadedUser!.profile.lastName.toValue()).toBe('Testuser');
      expect(loadedUser!.status.toValue()).toBe(originalUser.status.toValue());
      expect(loadedUser!.role.toValue()).toEqual(originalUser.role.toValue());
      expect(loadedUser!.createdAt.getTime()).toBe(originalUser.createdAt.getTime());
      expect(loadedUser!.updatedAt.getTime()).toBe(originalUser.updatedAt.getTime());
    });

    it('should handle users with no last login', async () => {
      // Arrange
      const user = User.random();
      expect(user.lastLoginAt).toBeUndefined();

      // Act
      await repository.save(user);
      const loadedUser = await repository.findById(user.id);

      // Assert
      expect(loadedUser!.lastLoginAt).toBeUndefined();
    });

    it('two findById should return the same user', async () => {
      // Arrange
      const user = User.random();
      await repository.save(user);

      // Act
      const found1 = await repository.findById(user.id);
      const found2 = await repository.findById(user.id);

      // Assert
      expect(found1?.equals(user)).toBe(true);
      expect(found2?.equals(user)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent operations', async () => {
      // Arrange
      const users = Array.from({ length: 100 }, () => User.random());

      // Act - Save all users concurrently
      await Promise.all(users.map((user) => repository.save(user)));

      // Assert
      const allUsers = await repository.findAll();
      expect(allUsers).toHaveLength(100);

      // All users should be retrievable
      for (const user of users) {
        const found = await repository.findById(user.id);
        expect(found).not.toBeNull();
        expect(found!.equals(user)).toBe(true);
      }
    });

    it('should handle special characters in filter values', async () => {
      // Arrange
      const user = User.random({
        username: new Username('testuser123'),
        profile: new UserProfile(new Name('John-Paul'), new Name('Van Berg')),
      });
      await repository.save(user);

      // Act & Assert - Hyphen in name
      const filter1 = new Filter(
        new FilterField('profile.firstName'),
        new FilterOperator(Operator.CONTAINS),
        new FilterValue('-'),
      );
      const result1 = await repository.findByCriteria(
        new Criteria({
          filters: new Filters([filter1]),
        }),
      );
      expect(result1.data).toHaveLength(1);

      // Act & Assert - Space in last name
      const filter2 = new Filter(
        new FilterField('profile.lastName'),
        new FilterOperator(Operator.CONTAINS),
        new FilterValue(' '),
      );
      const result2 = await repository.findByCriteria(
        new Criteria({
          filters: new Filters([filter2]),
        }),
      );
      expect(result2.data).toHaveLength(1);
    });

    it('should handle empty string filters', async () => {
      // Arrange
      const user = User.random({
        email: new Email('empty@test.com'),
        username: new Username('emptyuser'),
        profile: new UserProfile(
          new Name(''), // Empty first name
          new Name('Test'),
        ),
      });
      await repository.save(user);

      // Act
      const filter = new Filter(
        new FilterField('profile.firstName'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue(''),
      );
      const result = await repository.findByCriteria(
        new Criteria({
          filters: new Filters([filter]),
        }),
      );

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].profile.firstName.toValue()).toBe('');
    });

    it('should handle very large datasets efficiently', async () => {
      // Arrange - Create a large number of users
      const largeUserSet = Array.from({ length: 1000 }, (_, i) =>
        User.random({
          username: new Username(`user${i}`),
          email: new Email(`user${i}@example.com`),
          profile: new UserProfile(new Name(i % 2 === 0 ? 'Even' : 'Odd'), new Name('User')),
        }),
      );

      await Promise.all(largeUserSet.map((user) => repository.save(user)));

      // Act - Filter and paginate
      const filter = new Filter(
        new FilterField('profile.firstName'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue('Even'),
      );
      const start = performance.now();
      const result = await repository.findByCriteria(
        new Criteria({
          filters: new Filters([filter]),
          pagination: new PaginationOffset(50, 0),
        }),
      );
      const end = performance.now();

      // Assert
      expect(result.data).toHaveLength(50);
      expect(result.data.every((user) => user.profile.firstName.toValue() === 'Even')).toBe(true);
      expect(end - start).toBeLessThan(100); // Should complete quickly (< 100ms)
    });
  });
});
