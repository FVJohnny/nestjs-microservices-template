import { Test, TestingModule } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { MongoDBChannelRepository } from './mongodb-channel.repository';
import { Channel } from '../../../domain/entities/channel.entity';
import { Criteria, Filters, Filter, FilterField, FilterOperator, FilterValue, Operator } from '@libs/nestjs-common';
import { ChannelPersistenceException } from '../../errors';
import { SharedMongoDBModule } from '@libs/nestjs-mongodb';

describe('MongoDBChannelRepository (Integration)', () => {
  let repository: MongoDBChannelRepository;
  let mongoClient: MongoClient;

  // Use existing MongoDB instance from docker-compose with credentials
  const TEST_DB_NAME = "channels_test_db"
  const MONGODB_URI = process.env.MONGODB_URI || `mongodb://admin:admin123@localhost:27017/${TEST_DB_NAME}?authSource=admin`;

  beforeAll(async () => {
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

      repository = new MongoDBChannelRepository(mongoClient);
      console.log('Test setup completed');
    } catch (error) {
      console.error('Error in beforeAll setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup test database and close connection
    try {
      await mongoClient?.db(TEST_DB_NAME).dropDatabase();
      console.log('Cleaned up test database');
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
    await mongoClient?.close();
  });

  beforeEach(async () => {
    // Clean test database before each test
    const db = mongoClient.db(TEST_DB_NAME);
    await db.collection('channels').deleteMany({});
  });

  describe('save', () => {
    it('should save a new channel successfully', async () => {
      // Arrange
      const channel = Channel.random();

      // Act
      await repository.save(channel);

      // Assert
      const savedChannel = await repository.findById(channel.id);
      expect(savedChannel).not.toBeNull();

      expect(savedChannel?.equals(channel)).toBe(true);
    });

    it('should update an existing channel when saving with same id', async () => {
      // Arrange
      const channel = Channel.random({ name: 'Original Name' });
      await repository.save(channel);

      // Modify channel (simulate business logic change)
      const updatedChannel = Channel.random({
        id: channel.id,
        name: 'Updated Name'
      });

      // Act
      await repository.save(updatedChannel);

      // Assert
      const savedChannel = await repository.findById(channel.id);
      expect(savedChannel!.name).toBe('Updated Name');
      
      // Should still be only one document
      const allChannels = await repository.findByCriteria(new Criteria());
      expect(allChannels).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return channel when it exists', async () => {
      // Arrange
      const channel = Channel.random()
      await repository.save(channel);

      // Act
      const result = await repository.findById(channel.id);

      // Assert
      expect(result).not.toBeNull();
      expect(channel.equals(result)).toBe(true);
    });

    it('should return null when channel does not exist', async () => {
      // Act
      const result = await repository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true when channel exists', async () => {
      // Arrange
      const channel = Channel.random();
      await repository.save(channel);

      // Act
      const result = await repository.exists(channel.id);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when channel does not exist', async () => {
      // Act
      const result = await repository.exists('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove an existing channel', async () => {
      // Arrange
      const channel = Channel.random();
      await repository.save(channel);
      expect(await repository.exists(channel.id)).toBe(true);

      // Act
      await repository.remove(channel.id);

      // Assert
      expect(await repository.exists(channel.id)).toBe(false);
      expect(await repository.findById(channel.id)).toBeNull();
    });

    it('should throw error when trying to remove non-existent channel', async () => {
      // Act & Assert
      await expect(repository.remove('non-existent-id')).rejects.toThrow(
        ChannelPersistenceException
      );
    });
  });

  describe('findByCriteria', () => {
    beforeEach(async () => {
      // Setup test data
      const channels = [
        Channel.create({
          channelType: 'telegram',
          name: 'Telegram Channel 1',
          userId: 'user-1',
          connectionConfig: { token: 'token-1' },
        }),
        Channel.create({
          channelType: 'discord',
          name: 'Discord Channel 1',
          userId: 'user-1',
          connectionConfig: { webhookUrl: 'url-1' },
        }),
        Channel.create({
          channelType: 'telegram',
          name: 'Telegram Channel 2',
          userId: 'user-2',
          connectionConfig: { token: 'token-2' },
        }),
      ];

      for (const channel of channels) {
        await repository.save(channel);
      }
    });

    it('should return all channels when no filters applied', async () => {
      // Arrange
      const criteria = new Criteria();

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('should filter by userId', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('userId'),
            new FilterOperator(Operator.EQUAL),
            new FilterValue('user-1')
          ),
        ])
      );

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(c => c.userId === 'user-1')).toBe(true);
    });

    it('should filter by channelType', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('channelType'),
            new FilterOperator(Operator.EQUAL),
            new FilterValue('telegram')
          ),
        ])
      );

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(c => c.channelType.getValue() === 'telegram')).toBe(true);
    });
  });

  describe('countByCriteria', () => {
    beforeEach(async () => {
      // Setup test data
      const channels = [
        Channel.create({
          channelType: 'telegram',
          name: 'Channel 1',
          userId: 'user-1',
          connectionConfig: { token: 'token-1' },
        }),
        Channel.create({
          channelType: 'telegram',
          name: 'Channel 2',
          userId: 'user-2',
          connectionConfig: { token: 'token-2' },
        }),
      ];

      for (const channel of channels) {
        await repository.save(channel);
      }
    });

    it('should count all channels when no filters applied', async () => {
      // Arrange
      const criteria = new Criteria();

      // Act
      const result = await repository.countByCriteria(criteria);

      // Assert
      expect(result).toBe(2);
    });

    it('should count filtered channels', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('userId'),
            new FilterOperator(Operator.EQUAL),
            new FilterValue('user-1')
          ),
        ])
      );

      // Act
      const result = await repository.countByCriteria(criteria);

      // Assert
      expect(result).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should wrap database errors in ChannelPersistenceException', async () => {
      // Arrange - Mock the collection to throw an error
      const channel = Channel.random();
      const originalCollection = (repository as any).collection;
      const mockCollection = {
        ...originalCollection,
        updateOne: jest.fn().mockRejectedValue(new Error('Mock database error')),
      };
      (repository as any).collection = mockCollection;

      try {
        // Act & Assert
        await expect(repository.save(channel)).rejects.toThrow(
          ChannelPersistenceException
        );
      } finally {
        // Restore original collection
        (repository as any).collection = originalCollection;
      }
    });
  });
});