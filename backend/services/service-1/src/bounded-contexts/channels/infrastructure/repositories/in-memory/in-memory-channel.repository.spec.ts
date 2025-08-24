import { InMemoryChannelRepository } from './in-memory-channel.repository';
import { Channel } from '../../../domain/entities/channel.entity';
import {
  Criteria,
  Filters,
  Filter,
  FilterField,
  FilterOperator,
  FilterValue,
  Order,
  Operator,
} from '@libs/nestjs-common';
import { ChannelPersistenceException } from '../../errors';

describe('InMemoryChannelRepository', () => {
  let repository: InMemoryChannelRepository;

  beforeEach(() => {
    repository = new InMemoryChannelRepository();
  });

  describe('save', () => {
    it('should save a channel successfully', async () => {
      const channel = Channel.random();
      
      await repository.save(channel);
      const found = await repository.findById(channel.id);
      
      expect(found).not.toBeNull();
      expect(found?.id).toBe(channel.id);
      expect(found?.name).toBe(channel.name);
    });

    it('should update an existing channel when saving with same id', async () => {
      const channel = Channel.random({ name: 'Original Name' });
      await repository.save(channel);
      
      // Modify channel and save again
      const updatedChannel = Channel.random({ 
        name: 'Updated Name' 
      });
      // Manually set the same ID to simulate update
      Object.defineProperty(updatedChannel, 'id', {
        value: channel.id,
        writable: false,
        configurable: true
      });
      
      await repository.save(updatedChannel);
      const found = await repository.findById(channel.id);
      
      expect(found?.name).toBe('Updated Name');
    });

    it('should save multiple channels', async () => {
      const channels = [
        Channel.random({ userId: 'user-1' }),
        Channel.random({ userId: 'user-2' }),
        Channel.random({ userId: 'user-3' }),
      ];
      
      for (const channel of channels) {
        await repository.save(channel);
      }
      
      const allChannels = await repository.findByCriteria(
        new Criteria(Filters.none(), Order.none())
      );
      
      expect(allChannels).toHaveLength(3);
    });
  });

  describe('findById', () => {
    it('should return null when channel does not exist', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return the correct channel when it exists', async () => {
      const channel = Channel.random({
        name: 'Test Channel',
        userId: 'user-123',
        channelType: 'telegram'
      });
      
      await repository.save(channel);
      const found = await repository.findById(channel.id);
      
      expect(found).not.toBeNull();
      expect(found?.id).toBe(channel.id);
      expect(found?.name).toBe('Test Channel');
      expect(found?.userId).toBe('user-123');
      expect(found?.channelType.getValue()).toBe('telegram');
    });
  });

  describe('remove', () => {
    it('should remove an existing channel', async () => {
      const channel = Channel.random();
      await repository.save(channel);
      
      // Verify it exists
      let found = await repository.findById(channel.id);
      expect(found).not.toBeNull();
      
      // Remove it
      await repository.remove(channel.id);
      
      // Verify it's gone
      found = await repository.findById(channel.id);
      expect(found).toBeNull();
    });

    it('should not throw when removing non-existent channel', async () => {
      await expect(repository.remove('non-existent-id')).resolves.not.toThrow();
    });

    it('should only remove the specified channel', async () => {
      const channel1 = Channel.random();
      const channel2 = Channel.random();
      
      await repository.save(channel1);
      await repository.save(channel2);
      await repository.remove(channel1.id);
      
      const found1 = await repository.findById(channel1.id);
      const found2 = await repository.findById(channel2.id);
      
      expect(found1).toBeNull();
      expect(found2).not.toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true when channel exists', async () => {
      const channel = Channel.random();
      await repository.save(channel);
      
      const exists = await repository.exists(channel.id);
      expect(exists).toBe(true);
    });

    it('should return false when channel does not exist', async () => {
      const exists = await repository.exists('non-existent-id');
      expect(exists).toBe(false);
    });

    it('should return false after channel is removed', async () => {
      const channel = Channel.random();
      await repository.save(channel);
      await repository.remove(channel.id);
      
      const exists = await repository.exists(channel.id);
      expect(exists).toBe(false);
    });
  });

  describe('findByCriteria', () => {
    describe('filtering', () => {
      beforeEach(async () => {
        // Set up test data
        const channels = [
          Channel.random({ 
            userId: 'user-1', 
            name: 'Alpha Channel',
            channelType: 'telegram' 
          }),
          Channel.random({ 
            userId: 'user-1', 
            name: 'Beta Signal',
            channelType: 'discord' 
          }),
          Channel.random({ 
            userId: 'user-2', 
            name: 'Charlie Trading',
            channelType: 'telegram' 
          }),
          Channel.random({ 
            userId: 'user-2', 
            name: 'Delta Signals',
            channelType: 'whatsapp' 
          }),
        ];
        
        for (const channel of channels) {
          await repository.save(channel);
        }
      });

      it('should return all channels with no filters', async () => {
        const criteria = new Criteria(Filters.none(), Order.none());
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(4);
      });

      it('should filter by userId using EQUAL operator', async () => {
        const filters = new Filters([
          new Filter(
            new FilterField('userId'),
            FilterOperator.fromValue(Operator.EQUAL),
            new FilterValue('user-1')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(2);
        expect(results.every(c => c.userId === 'user-1')).toBe(true);
      });

      it('should filter by channelType using EQUAL operator', async () => {
        const filters = new Filters([
          new Filter(
            new FilterField('channelType'),
            FilterOperator.fromValue(Operator.EQUAL),
            new FilterValue('telegram')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(2);
        expect(results.every(c => c.channelType.getValue() === 'telegram')).toBe(true);
      });

      it('should filter by name using CONTAINS operator', async () => {
        const filters = new Filters([
          new Filter(
            new FilterField('name'),
            FilterOperator.fromValue(Operator.CONTAINS),
            new FilterValue('Signal')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(2);
        expect(results.every(c => c.name.includes('Signal'))).toBe(true);
      });

      it('should handle case-insensitive CONTAINS operator', async () => {
        const filters = new Filters([
          new Filter(
            new FilterField('name'),
            FilterOperator.fromValue(Operator.CONTAINS),
            new FilterValue('signal')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(2);
      });

      it('should filter using NOT_EQUAL operator', async () => {
        const filters = new Filters([
          new Filter(
            new FilterField('channelType'),
            FilterOperator.fromValue(Operator.NOT_EQUAL),
            new FilterValue('telegram')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(2);
        expect(results.every(c => c.channelType.getValue() !== 'telegram')).toBe(true);
      });

      it('should filter using NOT_CONTAINS operator', async () => {
        const filters = new Filters([
          new Filter(
            new FilterField('name'),
            FilterOperator.fromValue(Operator.NOT_CONTAINS),
            new FilterValue('Signal')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(2);
        expect(results.every(c => !c.name.includes('Signal'))).toBe(true);
      });

      it('should apply multiple filters (AND logic)', async () => {
        const filters = new Filters([
          new Filter(
            new FilterField('userId'),
            FilterOperator.fromValue(Operator.EQUAL),
            new FilterValue('user-1')
          ),
          new Filter(
            new FilterField('channelType'),
            FilterOperator.fromValue(Operator.EQUAL),
            new FilterValue('telegram')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(1);
        expect(results[0].userId).toBe('user-1');
        expect(results[0].channelType.getValue()).toBe('telegram');
      });

      it('should filter by isActive status', async () => {
        // Create some channels and deactivate some
        const activeChannel = Channel.random({ name: 'Active' });
        const inactiveChannel = Channel.random({ name: 'Inactive' });
        inactiveChannel.isActive = false;
        
        await repository.save(activeChannel);
        await repository.save(inactiveChannel);
        
        const filters = new Filters([
          new Filter(
            new FilterField('isActive'),
            FilterOperator.fromValue(Operator.EQUAL),
            new FilterValue('false')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        const inactiveResults = results.filter(c => c.name === 'Inactive');
        expect(inactiveResults).toHaveLength(1);
        expect(inactiveResults[0].isActive).toBe(false);
      });
    });

    describe('date filtering', () => {
      it('should filter by createdAt using GT operator', async () => {
        const oldDate = new Date('2023-01-01');
        const recentDate = new Date('2024-06-01');
        
        // Create channels with specific dates
        const oldChannel = Channel.random({ name: 'Old Channel' });
        Object.defineProperty(oldChannel, 'createdAt', {
          value: oldDate,
          writable: false,
          configurable: true
        });
        
        const recentChannel = Channel.random({ name: 'Recent Channel' });
        Object.defineProperty(recentChannel, 'createdAt', {
          value: recentDate,
          writable: false,
          configurable: true
        });
        
        await repository.save(oldChannel);
        await repository.save(recentChannel);
        
        const filters = new Filters([
          new Filter(
            new FilterField('createdAt'),
            FilterOperator.fromValue(Operator.GT),
            new FilterValue('2024-01-01')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Recent Channel');
      });

      it('should filter by createdAt using LT operator', async () => {
        const oldDate = new Date('2023-01-01');
        const recentDate = new Date('2024-06-01');
        
        const oldChannel = Channel.random({ name: 'Old Channel' });
        Object.defineProperty(oldChannel, 'createdAt', {
          value: oldDate,
          writable: false,
          configurable: true
        });
        
        const recentChannel = Channel.random({ name: 'Recent Channel' });
        Object.defineProperty(recentChannel, 'createdAt', {
          value: recentDate,
          writable: false,
          configurable: true
        });
        
        await repository.save(oldChannel);
        await repository.save(recentChannel);
        
        const filters = new Filters([
          new Filter(
            new FilterField('createdAt'),
            FilterOperator.fromValue(Operator.LT),
            new FilterValue('2024-01-01')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Old Channel');
      });
    });

    describe('edge cases', () => {
      it('should handle unknown field names gracefully', async () => {
        const channel = Channel.random();
        await repository.save(channel);
        
        const filters = new Filters([
          new Filter(
            new FilterField('unknownField'),
            FilterOperator.fromValue(Operator.EQUAL),
            new FilterValue('some-value')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        // Should return all channels since unknown field is ignored
        expect(results).toHaveLength(1);
      });

      it('should throw error for invalid operators', async () => {
        expect(() => {
          FilterOperator.fromValue('UNKNOWN_OP' as any);
        }).toThrow('The filter operator UNKNOWN_OP is invalid');
      });

      it('should return empty array when no channels match criteria', async () => {
        const channel = Channel.random({ userId: 'user-1' });
        await repository.save(channel);
        
        const filters = new Filters([
          new Filter(
            new FilterField('userId'),
            FilterOperator.fromValue(Operator.EQUAL),
            new FilterValue('user-999')
          ),
        ]);
        const criteria = new Criteria(filters, Order.none());
        
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toEqual([]);
      });

      it('should handle empty repository', async () => {
        const criteria = new Criteria(Filters.none(), Order.none());
        const results = await repository.findByCriteria(criteria);
        
        expect(results).toEqual([]);
      });
    });
  });

  describe('countByCriteria', () => {
    beforeEach(async () => {
      const channels = [
        Channel.random({ userId: 'user-1', channelType: 'telegram' }),
        Channel.random({ userId: 'user-1', channelType: 'discord' }),
        Channel.random({ userId: 'user-2', channelType: 'telegram' }),
        Channel.random({ userId: 'user-2', channelType: 'whatsapp' }),
        Channel.random({ userId: 'user-3', channelType: 'telegram' }),
      ];
      
      for (const channel of channels) {
        await repository.save(channel);
      }
    });

    it('should count all channels with no filters', async () => {
      const criteria = new Criteria(Filters.none(), Order.none());
      const count = await repository.countByCriteria(criteria);
      
      expect(count).toBe(5);
    });

    it('should count channels matching userId filter', async () => {
      const filters = new Filters([
        new Filter(
          new FilterField('userId'),
          FilterOperator.fromValue(Operator.EQUAL),
          new FilterValue('user-1')
        ),
      ]);
      const criteria = new Criteria(filters, Order.none());
      
      const count = await repository.countByCriteria(criteria);
      
      expect(count).toBe(2);
    });

    it('should count channels matching channelType filter', async () => {
      const filters = new Filters([
        new Filter(
          new FilterField('channelType'),
          FilterOperator.fromValue(Operator.EQUAL),
          new FilterValue('telegram')
        ),
      ]);
      const criteria = new Criteria(filters, Order.none());
      
      const count = await repository.countByCriteria(criteria);
      
      expect(count).toBe(3);
    });

    it('should count channels matching multiple filters', async () => {
      const filters = new Filters([
        new Filter(
          new FilterField('userId'),
          FilterOperator.fromValue(Operator.EQUAL),
          new FilterValue('user-2')
        ),
        new Filter(
          new FilterField('channelType'),
          FilterOperator.fromValue(Operator.EQUAL),
          new FilterValue('telegram')
        ),
      ]);
      const criteria = new Criteria(filters, Order.none());
      
      const count = await repository.countByCriteria(criteria);
      
      expect(count).toBe(1);
    });

    it('should return 0 when no channels match', async () => {
      const filters = new Filters([
        new Filter(
          new FilterField('userId'),
          FilterOperator.fromValue(Operator.EQUAL),
          new FilterValue('non-existent-user')
        ),
      ]);
      const criteria = new Criteria(filters, Order.none());
      
      const count = await repository.countByCriteria(criteria);
      
      expect(count).toBe(0);
    });

    it('should return 0 for empty repository', async () => {
      // Clear the repository
      const allChannels = await repository.findByCriteria(
        new Criteria(Filters.none(), Order.none())
      );
      for (const channel of allChannels) {
        await repository.remove(channel.id);
      }
      
      const criteria = new Criteria(Filters.none(), Order.none());
      const count = await repository.countByCriteria(criteria);
      
      expect(count).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle errors in save operation', async () => {
      const channel = Channel.random();
      
      // Mock the internal Map to throw an error
      const mockSet = jest.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Access private property for testing
      (repository as any).channels = {
        set: mockSet,
        get: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
        values: jest.fn().mockReturnValue([]),
      };
      
      await expect(repository.save(channel)).rejects.toThrow(ChannelPersistenceException);
    });

    it('should handle errors in findById operation', async () => {
      const mockGet = jest.fn().mockImplementation(() => {
        throw new Error('Retrieval error');
      });
      
      (repository as any).channels = {
        get: mockGet,
        set: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
        values: jest.fn().mockReturnValue([]),
      };
      
      await expect(repository.findById('test-id')).rejects.toThrow(ChannelPersistenceException);
    });

    it('should handle errors in remove operation', async () => {
      const mockDelete = jest.fn().mockImplementation(() => {
        throw new Error('Deletion error');
      });
      
      (repository as any).channels = {
        delete: mockDelete,
        set: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        values: jest.fn().mockReturnValue([]),
      };
      
      await expect(repository.remove('test-id')).rejects.toThrow(ChannelPersistenceException);
    });

    it('should handle errors in exists operation', async () => {
      const mockHas = jest.fn().mockImplementation(() => {
        throw new Error('Check error');
      });
      
      (repository as any).channels = {
        has: mockHas,
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
        values: jest.fn().mockReturnValue([]),
      };
      
      await expect(repository.exists('test-id')).rejects.toThrow(ChannelPersistenceException);
    });

    it('should handle errors in findByCriteria operation', async () => {
      const mockValues = jest.fn().mockImplementation(() => {
        throw new Error('Query error');
      });
      
      (repository as any).channels = {
        values: mockValues,
        set: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
      };
      
      const criteria = new Criteria(Filters.none(), Order.none());
      await expect(repository.findByCriteria(criteria)).rejects.toThrow(ChannelPersistenceException);
    });
  });

  describe('persistence and state management', () => {
    it('should maintain state across operations', async () => {
      const channel1 = Channel.random({ name: 'Channel 1' });
      const channel2 = Channel.random({ name: 'Channel 2' });
      const channel3 = Channel.random({ name: 'Channel 3' });
      
      // Save channels
      await repository.save(channel1);
      await repository.save(channel2);
      await repository.save(channel3);
      
      // Verify all exist
      expect(await repository.exists(channel1.id)).toBe(true);
      expect(await repository.exists(channel2.id)).toBe(true);
      expect(await repository.exists(channel3.id)).toBe(true);
      
      // Remove one
      await repository.remove(channel2.id);
      
      // Verify state
      expect(await repository.exists(channel1.id)).toBe(true);
      expect(await repository.exists(channel2.id)).toBe(false);
      expect(await repository.exists(channel3.id)).toBe(true);
      
      // Count remaining
      const count = await repository.countByCriteria(
        new Criteria(Filters.none(), Order.none())
      );
      expect(count).toBe(2);
    });

    it('should isolate repository instances', async () => {
      const repo1 = new InMemoryChannelRepository();
      const repo2 = new InMemoryChannelRepository();
      
      const channel = Channel.random();
      await repo1.save(channel);
      
      expect(await repo1.exists(channel.id)).toBe(true);
      expect(await repo2.exists(channel.id)).toBe(false);
    });
  });
});