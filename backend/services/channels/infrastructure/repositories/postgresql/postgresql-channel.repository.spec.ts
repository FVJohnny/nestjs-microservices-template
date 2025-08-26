import { DataSource } from 'typeorm';
import { PostgreSQLChannelRepository } from './postgresql-channel.repository';
import { PostgreSQLChannelEntity } from './channel.schema';
import { Channel } from '../../../domain/entities/channel.entity';
import { Criteria, Filters, Filter, FilterField, FilterOperator, FilterValue, Operator } from '@libs/nestjs-common';
import { ChannelPersistenceException } from '../../errors';

describe('PostgreSQLChannelRepository (Integration)', () => {
  let repository: PostgreSQLChannelRepository;
  let dataSource: DataSource;

  // Use existing PostgreSQL instance from docker-compose
  const POSTGRES_CONFIG = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'service-1-db',
  };

  beforeAll(async () => {
    try {
      console.log('Setting up PostgreSQL test database...');
      console.log('PostgreSQL config:', { ...POSTGRES_CONFIG, password: '***' });

      // Create DataSource directly (simpler approach)
      dataSource = new DataSource({
        type: 'postgres',
        ...POSTGRES_CONFIG,
        entities: [PostgreSQLChannelEntity],
        synchronize: true, // Creates tables if they don't exist
        logging: false,
      });

      await dataSource.initialize();
      console.log('PostgreSQL connection established');

      // Create repository with direct TypeORM repository
      const typeOrmRepository = dataSource.getRepository(PostgreSQLChannelEntity);
      repository = new PostgreSQLChannelRepository(typeOrmRepository);
      
      console.log('Test setup completed');
    } catch (error) {
      console.error('Error in beforeAll setup:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup
    try {
      if (dataSource?.isInitialized) {
        await dataSource.destroy();
        console.log('PostgreSQL connection closed');
      }
    } catch (error) {
      console.error('Error cleaning up database:', error);
    }
  });

  beforeEach(async () => {
    await dataSource.getRepository(PostgreSQLChannelEntity)
      .clear();
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
    it('should return channel when it exists and is active', async () => {
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
      const result = await repository.findById('00000000-0000-0000-0000-000000000000');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true when active channel exists', async () => {
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
      const result = await repository.exists('00000000-0000-0000-0000-000000000000');

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

    it('should exclude inactive channels from results', async () => {
      // Arrange
      const channels = await repository.findByCriteria(new Criteria());
      const firstChannel = channels[0];
      
      // Soft delete one channel
      await repository.remove(firstChannel.id);

      // Act
      const result = await repository.findByCriteria(new Criteria());

      // Assert
      expect(result).toHaveLength(2); // Should exclude the soft-deleted one
      expect(result.find(c => c.id === firstChannel.id)).toBeUndefined();
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

    it('should count all active channels when no filters applied', async () => {
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

    it('should exclude inactive channels from count', async () => {
      // Arrange
      const channels = await repository.findByCriteria(new Criteria());
      await repository.remove(channels[0].id); // Soft delete one channel

      // Act
      const result = await repository.countByCriteria(new Criteria());

      // Assert
      expect(result).toBe(2); // Should exclude the soft-deleted one
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

  describe('error handling', () => {
    it('should wrap database errors in ChannelPersistenceException', async () => {
      // Arrange - Mock the repository to throw an error
      const channel = Channel.random();
      const originalSave = (repository as any).channelRepository.save;
      (repository as any).channelRepository.save = jest.fn().mockRejectedValue(new Error('Mock database error'));

      try {
        // Act & Assert
        await expect(repository.save(channel)).rejects.toThrow(
          ChannelPersistenceException
        );
      } finally {
        // Restore original method
        (repository as any).channelRepository.save = originalSave;
      }
    });

    it('should handle invalid query parameters gracefully', async () => {
      // Arrange - Create criteria with invalid operator (this should be handled by query builder)
      const criteria = new Criteria(
        new Filters([
          new Filter(
            new FilterField('invalidField'),
            new FilterOperator(Operator.EQUAL),
            new FilterValue('test-value')
          ),
        ])
      );

      // Act & Assert - Should handle gracefully without crashing
      await expect(repository.findByCriteria(criteria)).rejects.toThrow(
        ChannelPersistenceException
      );
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
      expect(foundChannel2).toBeNull(); // Should be soft deleted
      expect(await repository.countByCriteria(new Criteria())).toBe(1);
    });

    it('should handle JSONB connectionConfig properly', async () => {
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
});