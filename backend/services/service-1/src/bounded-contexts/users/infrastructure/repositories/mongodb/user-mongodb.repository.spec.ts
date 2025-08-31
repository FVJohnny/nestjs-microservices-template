import { Test, TestingModule } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { UserMongodbRepository } from './user-mongodb.repository';
import { User } from '../../../domain/entities/user.entity';
import { Criteria, Filters, Filter, FilterField, FilterOperator, FilterValue, Operator, Order } from '@libs/nestjs-common';
import { UserPersistenceException } from '../../errors';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Name } from '../../../domain/value-objects/name.vo';
import { UserProfile } from '../../../domain/value-objects/user-profile.vo';
import { UserRole, UserRoleEnum } from '../../../domain/value-objects/user-role.vo';

describe('UserMongodbRepository (Integration)', () => {
  let repository: UserMongodbRepository;
  let mongoClient: MongoClient;

  // Use existing MongoDB instance from docker-compose with credentials
  const TEST_DB_NAME = "users_test_db";
  const MONGODB_URI = process.env.MONGODB_URI || `mongodb://admin:admin123@localhost:27017/${TEST_DB_NAME}?authSource=admin`;

  beforeAll(async () => {
    await setupDatabase();
  }, 30000);

  afterAll(async () => {
    await cleanupDatabase();
  }, 30000);

  beforeEach(async () => {
    await clearTestData();
  });

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

      // Modify user (simulate business logic change)
      user.updateProfile({
        firstName: new Name('Updated'),
        lastName: new Name('Name')
      });

      // Act
      await repository.save(user);

      // Assert
      const savedUser = await repository.findById(user.id);
      expect(savedUser!.profile.firstName.toValue()).toBe('Updated');
      expect(savedUser!.profile.lastName.toValue()).toBe('Name');
      
      // Should still be only one document
      const allUsers = await repository.findByCriteria(new Criteria());
      expect(allUsers).toHaveLength(1);
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
      const result = await repository.findByEmail(new Email('test@example.com'));

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

  describe('remove/delete', () => {
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

    it('should not throw error when trying to remove non-existent user', async () => {
      // Act & Assert - Should not throw
      await expect(repository.remove('non-existent-id')).resolves.not.toThrow();
    });

    it('delete method should work the same as remove', async () => {
      // Arrange
      const user = User.random();
      await repository.save(user);

      // Act
      await repository.delete(user.id);

      // Assert
      expect(await repository.exists(user.id)).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      const testUsers = createTestUsers();
      await saveTestUsers(testUsers);

      // Act
      const results = await repository.findAll();

      // Assert
      expect(results).toHaveLength(testUsers.length);
      results.forEach((result, index) => {
        const testUser = testUsers.find((user) => user.id === result.id);
        expect(result.equals(testUser)).toBe(true);
      });
    });

    it('should return empty array when no users exist', async () => {
      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('findByCriteria', () => {
    let testUsers: User[] = [];
    
    beforeEach(async () => {
      testUsers = createTestUsers();
      await saveTestUsers(testUsers);
    });

    it('should return all users when no filters applied', async () => {
      // Arrange
      const criteria = new Criteria();

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(testUsers.length);
    });

    it('should filter by email', async () => {
      // Arrange
      const filter = new Filter(
        new FilterField('email'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue('admin@example.com')
      );
      const criteria = new Criteria({
        filters: new Filters([ filter ]),
      });

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].email.toValue()).toBe('admin@example.com');
    });

    it('should filter by username', async () => {
      // Arrange
      const filter = new Filter(
        new FilterField('username'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue('admin')
      );
      const criteria = new Criteria({
        filters: new Filters([ filter ]),
      });

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].username.toValue()).toBe('admin');
    });

    it('should filter by firstName', async () => {
      // Arrange
      const filter = new Filter(
        new FilterField('profile.firstName'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue('John')
      );
      const criteria = new Criteria({
        filters: new Filters([ filter ]),
      });

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].profile.firstName.toValue()).toBe('John');
    });

    it('should filter by lastName', async () => {
      // Arrange
      const filter = new Filter(
        new FilterField('profile.lastName'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue('Doe')
      );
      const criteria = new Criteria({
        filters: new Filters([ filter ]),
      });

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].profile.firstName.toValue()).toBe('John');
    });

    it('should apply limit', async () => {
      // Arrange
      const criteria = new Criteria({
        limit: 1,
      });

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should apply offset', async () => {
      // Arrange
      const offset = 1;
      const criteria = new Criteria({
        offset,
      });

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(testUsers.length - offset); // Total 3, offset 1 = 2 results
    });

    it('should combine limit and offset', async () => {
      // Arrange
      const criteria = new Criteria({
        limit: 1,
        offset: 1,
      });

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  describe('countByCriteria', () => {
    let testUsers: User[] = [];
    
    beforeEach(async () => {
      testUsers = createTestUsers();
      await saveTestUsers(testUsers);
    });

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
        new FilterOperator(Operator.EQUAL),
        new FilterValue('John')
      );
      const criteria = new Criteria({
        filters: new Filters([ filter ]),
      });

      // Act
      const result = await repository.countByCriteria(criteria);

      // Assert
      expect(result).toBe(1);
    });

    it('should return 0 when no matches found', async () => {
      // Arrange
      const filter = new Filter(
        new FilterField('email'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue('nonexistent@example.com')
      );
      const criteria = new Criteria({
        filters: new Filters([ filter ]),
      });

      // Act
      const result = await repository.countByCriteria(criteria);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should wrap database errors in UserPersistenceException for save operation', async () => {
      // Arrange - Mock the collection to throw an error
      const user = User.random();
      const originalCollection = (repository as any).collection;
      const mockCollection = {
        ...originalCollection,
        updateOne: jest.fn().mockRejectedValue(new Error('Mock database error')),
      };
      (repository as any).collection = mockCollection;

      try {
        // Act & Assert
        await expect(repository.save(user)).rejects.toThrow(
          UserPersistenceException
        );
      } finally {
        // Restore original collection
        (repository as any).collection = originalCollection;
      }
    });

    it('should wrap database errors in UserPersistenceException for findById operation', async () => {
      // Arrange - Mock the collection to throw an error
      const originalCollection = (repository as any).collection;
      const mockCollection = {
        ...originalCollection,
        findOne: jest.fn().mockRejectedValue(new Error('Mock database error')),
      };
      (repository as any).collection = mockCollection;

      try {
        // Act & Assert
        await expect(repository.findById('test-id')).rejects.toThrow(
          UserPersistenceException
        );
      } finally {
        // Restore original collection
        (repository as any).collection = originalCollection;
      }
    });

    it('should wrap database errors in UserPersistenceException for existsByEmail operation', async () => {
      // Arrange - Mock the collection to throw an error
      const originalCollection = (repository as any).collection;
      const mockCollection = {
        ...originalCollection,
        countDocuments: jest.fn().mockRejectedValue(new Error('Mock database error')),
      };
      (repository as any).collection = mockCollection;

      try {
        // Act & Assert
        await expect(repository.existsByEmail(new Email('test@example.com'))).rejects.toThrow(
          UserPersistenceException
        );
      } finally {
        // Restore original collection
        (repository as any).collection = originalCollection;
      }
    });
  });

  describe('data integrity', () => {
    it('should preserve all user properties through save/load cycle', async () => {
      // Arrange
      const originalUser = User.random({
        email: new Email('test@example.com'),
        username: new Username('testuser'),
        profile: new UserProfile(
          new Name('Test'),
          new Name('User')
        ),
        roles: [UserRole.admin(), UserRole.user()],
      });

      // Modify some properties to test different states
      originalUser.updateProfile({
        firstName: new Name('Modified'),
        lastName: new Name('Testuser')
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
      expect(loadedUser!.roles.map(r => r.toValue())).toEqual(originalUser.roles.map(r => r.toValue()));
      expect(loadedUser!.createdAt.getTime()).toBe(originalUser.createdAt.getTime());
      expect(loadedUser!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUser.updatedAt.getTime());
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
  });

  // Helper functions
  const setupDatabase = async (): Promise<void> => {
    try {
      console.log('Connecting to existing MongoDB instance...');
      console.log('MongoDB URI:', MONGODB_URI);

      // Create MongoDB client
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      console.log('Connected to MongoDB successfully');

      // Test connection
      await mongoClient.db().admin().ping();
      console.log('MongoDB ping successful');

      // Create repository instance that uses the test database
      const testMongoClient = {
        ...mongoClient,
        db: (dbName?: string) => mongoClient.db(TEST_DB_NAME)
      };
      repository = new UserMongodbRepository(testMongoClient as any);
      console.log('Test setup completed');
    } catch (error) {
      console.error('Error in database setup:', error);
      throw error;
    }
  };

  const cleanupDatabase = async (): Promise<void> => {
    try {
      await mongoClient?.db(TEST_DB_NAME).dropDatabase();
      console.log('Cleaned up test database');
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
    await mongoClient?.close();
  };

  const clearTestData = async (): Promise<void> => {
    const db = mongoClient.db(TEST_DB_NAME);
    await db.collection('users').deleteMany({});
  };

  const createTestUsers = (): User[] => [
    User.random({
      email: new Email('admin@example.com'),
      username: new Username('admin'),
      profile: new UserProfile(
        new Name('Admin'),
        new Name('User')
      ),
      roles: [UserRole.admin()],
    }),
    User.random({
      email: new Email('user1@example.com'),
      username: new Username('user1'),
      profile: new UserProfile(
        new Name('John'),
        new Name('Doe')
      ),
      roles: [UserRole.user()],
    }),
    User.random({
      email: new Email('user2@example.com'),
      username: new Username('user2'),
      profile: new UserProfile(
        new Name('Jane'),
        new Name('Smith')
      ),
      roles: [UserRole.user()],
    }),
  ];

  const saveTestUsers = async (users: User[]): Promise<void> => {
    for (const user of users) {
      await repository.save(user);
    }
  };
});