import { RedisChannelRepository } from './redis-channel.repository';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelPersistenceException } from '../../errors';
import { Criteria, Filters, Filter, FilterField, FilterOperator, FilterValue, Operator } from '@libs/nestjs-common';
import { RedisService } from '@libs/nestjs-redis';

describe('RedisChannelRepository (Integration)', () => {
  let repository: RedisChannelRepository;
  let redisService: RedisService;

  beforeAll(async () => {
    console.log('Setting up Redis test client...');

    // Set environment variables for Redis test setup
    process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
    process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
    process.env.REDIS_DB = '15'; // Use separate database for tests
    process.env.DISABLE_REDIS = 'false';

    redisService = new RedisService();

    console.log('Redis config:', {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT, 10),
      db: 15,
    });

    // Initialize the service
    await redisService.onModuleInit();

    try {
      // Wait for Redis connection using the underlying client
      const client = redisService.getClient();
      if (!client) {
        throw new Error('Redis client not initialized');
      }
      await client.ping();
      console.log('Redis connection established');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }


    repository = new RedisChannelRepository(redisService)
    console.log('Test setup completed');
  });

  afterAll(async () => {
    try {
      // Clean up any remaining test data
      const client = redisService.getClient();
      if (client) {
        await client.flushdb();
      }
      
      // Properly close all Redis connections
      await redisService.onModuleDestroy();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error cleaning up Redis:', error);
    }
  });

  beforeEach(async () => {
    // Clear Redis database before each test
    const client = redisService.getClient();
    if (client) {
      await client.flushdb();
    }
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
      expect(channel.equals(savedChannel)).toBe(true);
    });

    it('should update an existing channel when saving with same id', async () => {
      // Arrange
      const channel = Channel.random();
      await repository.save(channel);

      // Modify channel properties
      const updatedChannel = Channel.random({
        id: channel.id,
      });

      // Act
      await repository.save(updatedChannel);

      // Assert
      const savedChannel = await repository.findById(channel.id);
      expect(savedChannel).not.toBeNull();
      expect(updatedChannel.equals(savedChannel)).toBe(true);
      
      // Should still be only one record
      const allChannels = await repository.findByCriteria(new Criteria());
      expect(allChannels).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return channel when it exists', async () => {
      // Arrange
      const channel = Channel.random();
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
    it('should delete an existing channel', async () => {
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

    it('should not throw error when trying to remove non-existent channel', async () => {
      // Act & Assert - should not throw
      await expect(repository.remove('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('findByCriteria', () => {
    beforeEach(async () => {
      // Setup test data
      const channels = [
        Channel.random({
          channelType: 'telegram',
          name: 'Telegram Channel 1',
          userId: 'user-1',
        }),
        Channel.random({
          channelType: 'discord',
          name: 'Discord Channel 1',
          userId: 'user-1',
        }),
        Channel.random({
          channelType: 'telegram',
          name: 'Telegram Channel 2',
          userId: 'user-2',
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

    it('should filter by userId using EQUAL operator', async () => {
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

    it('should filter by channelType using EQUAL operator', async () => {
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

    it('should filter by name using CONTAINS operator', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('name'),
            new FilterOperator(Operator.CONTAINS),
            new FilterValue('Telegram')
          ),
        ])
      );

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(c => c.name.toLowerCase().includes('telegram'))).toBe(true);
    });

    it('should handle case-insensitive CONTAINS operator', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('name'),
            new FilterOperator(Operator.CONTAINS),
            new FilterValue('TELEGRAM')
          ),
        ])
      );

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should filter using NOT_EQUAL operator', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('channelType'),
            new FilterOperator(Operator.NOT_EQUAL),
            new FilterValue('telegram')
          ),
        ])
      );

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].channelType.getValue()).toBe('discord');
    });

    it('should filter using NOT_CONTAINS operator', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('name'),
            new FilterOperator(Operator.NOT_CONTAINS),
            new FilterValue('Telegram')
          ),
        ])
      );

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].channelType.getValue()).toBe('discord');
    });

    it('should apply multiple filters (AND logic)', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('userId'),
            new FilterOperator(Operator.EQUAL),
            new FilterValue('user-1')
          ),
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
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].channelType.getValue()).toBe('telegram');
    });
  });

  describe('countByCriteria', () => {
    beforeEach(async () => {
      // Setup test data
      const channels = [
        Channel.random({
          channelType: 'telegram',
          userId: 'user-1',
        }),
        Channel.random({
          channelType: 'telegram',
          userId: 'user-2',
        }),
        Channel.random({
          channelType: 'discord',
          userId: 'user-1',
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
      expect(result).toBe(3);
    });

    it('should count channels matching userId filter', async () => {
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
      expect(result).toBe(2);
    });

    it('should count channels matching channelType filter', async () => {
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
      const result = await repository.countByCriteria(criteria);

      // Assert
      expect(result).toBe(2);
    });

    it('should count channels matching multiple filters', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('userId'),
            new FilterOperator(Operator.EQUAL),
            new FilterValue('user-1')
          ),
          new Filter(
            new FilterField('channelType'),
            new FilterOperator(Operator.EQUAL),
            new FilterValue('telegram')
          ),
        ])
      );

      // Act
      const result = await repository.countByCriteria(criteria);

      // Assert
      expect(result).toBe(1);
    });

    it('should return 0 when no channels match criteria', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('userId'),
            new FilterOperator(Operator.EQUAL),
            new FilterValue('non-existent-user-id')
          ),
        ])
      );

      // Act
      const result = await repository.countByCriteria(criteria);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('date filtering', () => {
    beforeEach(async () => {
      // Create channels with different creation dates
      const baseDate = new Date('2024-01-01');
      const channels = [
        Channel.random({ createdAt: new Date(baseDate.getTime()) }),
        Channel.random({ createdAt: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000) }),
        Channel.random({ createdAt: new Date(baseDate.getTime() + 48 * 60 * 60 * 1000) }),
      ];

      for (const channel of channels) {
        await repository.save(channel);
      }
    });

    it('should filter by createdAt using GT operator', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('createdAt'),
            new FilterOperator(Operator.GT),
            new FilterValue('2024-01-01T12:00:00.000Z')
          ),
        ])
      );

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(c => c.createdAt > new Date('2024-01-01T12:00:00.000Z'))).toBe(true);
    });

    it('should filter by createdAt using LT operator', async () => {
      // Arrange
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('createdAt'),
            new FilterOperator(Operator.LT),
            new FilterValue('2024-01-02T12:00:00.000Z')
          ),
        ])
      );

      // Act
      const result = await repository.findByCriteria(criteria);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(c => c.createdAt < new Date('2024-01-02T12:00:00.000Z'))).toBe(true);
    });
  });

  describe('findByUserId', () => {
    beforeEach(async () => {
      // Setup test data
      const channels = [
        Channel.random({ userId: 'user-1' }),
        Channel.random({ userId: 'user-1' }),
        Channel.random({ userId: 'user-2' }),
      ];

      for (const channel of channels) {
        await repository.save(channel);
      }
    });

    it('should find channels by userId', async () => {
      // Act
      const result = await repository.findByUserId('user-1');

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(c => c.userId === 'user-1')).toBe(true);
    });

    it('should return empty array when user has no channels', async () => {
      // Act
      const result = await repository.findByUserId('non-existent-user');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('countByUserId', () => {
    beforeEach(async () => {
      // Setup test data
      const channels = [
        Channel.random({ userId: 'user-1' }),
        Channel.random({ userId: 'user-1' }),
        Channel.random({ userId: 'user-2' }),
      ];

      for (const channel of channels) {
        await repository.save(channel);
      }
    });

    it('should count channels by userId', async () => {
      // Act
      const result = await repository.countByUserId('user-1');

      // Assert
      expect(result).toBe(2);
    });

    it('should return 0 when user has no channels', async () => {
      // Act
      const result = await repository.countByUserId('non-existent-user');

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should wrap Redis errors in ChannelPersistenceException', async () => {
      // Arrange - Mock the Redis service to throw an error
      const channel = Channel.random();
      const originalSet = redisService.set;
      redisService.set = jest.fn().mockRejectedValue(new Error('Mock Redis error'));

      try {
        // Act & Assert
        await expect(repository.save(channel)).rejects.toThrow(
          ChannelPersistenceException
        );
      } finally {
        // Restore original method
        redisService.set = originalSet;
      }
    });

    it('should handle invalid JSON data gracefully', async () => {
      // Arrange - Set invalid JSON directly in Redis
      const client = redisService.getClient();
      if (client) {
        await client.set('channel:invalid', 'invalid-json-data');
      }

      // Act
      const result = await repository.findById('invalid');

      // Assert - Should return null for invalid JSON data
      expect(result).toBeNull();
    });
  });

  describe('persistence and state management', () => {
    it('should maintain state across operations', async () => {
      // Arrange
      const channel1 = Channel.random();
      const channel2 = Channel.random();

      // Act
      await repository.save(channel1);
      await repository.save(channel2);
      
      const foundChannel1 = await repository.findById(channel1.id);
      await repository.remove(channel2.id);
      const foundChannel2 = await repository.findById(channel2.id);

      // Assert
      expect(foundChannel1).not.toBeNull();
      expect(channel1.equals(foundChannel1)).toBe(true);
      expect(foundChannel2).toBeNull(); // Should be deleted
      expect(await repository.countByCriteria(new Criteria())).toBe(1);
    });

    it('should handle complex connectionConfig properly', async () => {
      // Arrange
      const complexConfig = {
        token: 'main-token',
        credentials: {
          apiKey: 'key-123',
          apiSecret: 'secret-456',
          nested: {
            endpoint: 'https://api.example.com',
            version: 'v2',
            features: ['feature1', 'feature2'],
          },
        },
        settings: {
          retryCount: 3,
          timeout: 5000,
          enableLogging: true,
        },
      };

      const channel = Channel.random({
        channelType: 'telegram',
        name: 'Complex Config Channel',
        userId: 'user-123',
        connectionConfig: complexConfig,
      });

      // Act
      await repository.save(channel);
      const savedChannel = await repository.findById(channel.id);

      // Assert
      expect(savedChannel).not.toBeNull();
      expect(savedChannel!.connectionConfig).toEqual(complexConfig);
    });
  });

  describe('user indexing', () => {
    it('should maintain user index when saving channels', async () => {
      // Arrange
      const channel1 = Channel.random({ userId: 'user-1' });
      const channel2 = Channel.random({ userId: 'user-1' });

      // Act
      await repository.save(channel1);
      await repository.save(channel2);

      // Assert - Check that user index is maintained
      const userChannels = await repository.findByUserId('user-1');
      expect(userChannels).toHaveLength(2);
      
      const userCount = await repository.countByUserId('user-1');
      expect(userCount).toBe(2);
    });

    it('should clean up user index when removing channels', async () => {
      // Arrange
      const channel1 = Channel.random({ userId: 'user-1' });
      const channel2 = Channel.random({ userId: 'user-1' });
      await repository.save(channel1);
      await repository.save(channel2);

      // Act - Remove one channel
      await repository.remove(channel1.id);

      // Assert - User should still have one channel
      const userChannels = await repository.findByUserId('user-1');
      expect(userChannels).toHaveLength(1);
      expect(userChannels[0].id).toBe(channel2.id);
      
      const userCount = await repository.countByUserId('user-1');
      expect(userCount).toBe(1);
    });
  });
});