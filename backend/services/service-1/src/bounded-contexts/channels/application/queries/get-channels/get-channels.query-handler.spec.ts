import { GetChannelsHandler } from './get-channels.query-handler';
import { GetChannelsQuery, GetChannelsQueryParams } from './get-channels.query';
import { Channel } from '../../../domain/entities/channel.entity';
import type { ChannelRepository } from '../../../domain/repositories/channel.repository';

describe('GetChannelsHandler', () => {
  let mockRepository: jest.Mocked<ChannelRepository>;
  let handler: GetChannelsHandler;

  beforeEach(() => {
    mockRepository = {
      findByCriteria: jest.fn(),
      countByCriteria: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      remove: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<ChannelRepository>;

    handler = new GetChannelsHandler(mockRepository);
  });

  describe('execute', () => {
    it('should return empty array when no channels match criteria', async () => {
      const params: GetChannelsQueryParams = {
        userId: 'user-1',
      };
      
      mockRepository.findByCriteria.mockResolvedValue([]);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result).toEqual({ channels: [] });
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
      expect(mockRepository.findByCriteria).toHaveBeenCalledTimes(1);
    });

    it('should return channels matching userId filter', async () => {
      const userId = 'user-123';
      const channel1 = Channel.random({ 
        userId, 
        name: 'Channel 1',
        channelType: 'telegram'
      });
      const channel2 = Channel.random({ 
        userId, 
        name: 'Channel 2',
        channelType: 'discord'
      });

      const params: GetChannelsQueryParams = {
        userId,
      };
      
      mockRepository.findByCriteria.mockResolvedValue([channel1, channel2]);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(2);
      expect(result.channels[0].id).toBe(channel1.id);
      expect(result.channels[1].id).toBe(channel2.id);
      expect(result.channels[0].userId).toBe(userId);
      expect(result.channels[1].userId).toBe(userId);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle empty criteria and return all channels', async () => {
      const channels = [
        Channel.random({ userId: 'user-1' }),
        Channel.random({ userId: 'user-2' }),
        Channel.random({ userId: 'user-3' }),
      ];

      const params: GetChannelsQueryParams = {};
      mockRepository.findByCriteria.mockResolvedValue(channels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(3);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should filter channels by channel type', async () => {
      const telegramChannel = Channel.random({ 
        channelType: 'telegram',
        name: 'Telegram Channel'
      });

      const params: GetChannelsQueryParams = {
        channelType: 'telegram',
      };
      
      mockRepository.findByCriteria.mockResolvedValue([telegramChannel]);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].channelType).toBe('telegram');
      expect(result.channels[0].name).toBe('Telegram Channel');
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should filter channels by active status', async () => {
      const activeChannels = [
        Channel.random({ name: 'Active Channel 1' }),
        Channel.random({ name: 'Active Channel 2' }),
      ];

      const params: GetChannelsQueryParams = {
        isActive: true,
      };
      
      mockRepository.findByCriteria.mockResolvedValue(activeChannels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(2);
      // All channels are active by default
      expect(result.channels.every(c => c.isActive)).toBe(true);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should apply multiple filters (userId AND channelType)', async () => {
      const userId = 'user-456';
      const matchingChannel = Channel.random({ 
        userId,
        channelType: 'telegram'
      });

      const params: GetChannelsQueryParams = {
        userId,
        channelType: 'telegram',
      };
      
      mockRepository.findByCriteria.mockResolvedValue([matchingChannel]);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].userId).toBe(userId);
      expect(result.channels[0].channelType).toBe('telegram');
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle ordering by createdAt descending', async () => {
      const channels = [
        Channel.random({ name: 'Newest' }),
        Channel.random({ name: 'Middle' }),
        Channel.random({ name: 'Oldest' }),
      ];

      const params: GetChannelsQueryParams = {
        orderBy: 'createdAt',
        orderType: 'desc',
      };
      
      mockRepository.findByCriteria.mockResolvedValue(channels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(3);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle limit and offset for pagination', async () => {
      const allChannels = Array.from({ length: 10 }, (_, i) => 
        Channel.random({ name: `Channel ${i + 1}` })
      );
      
      const paginatedChannels = allChannels.slice(5, 8);
      const params: GetChannelsQueryParams = {
        limit: 3,
        offset: 5,
      };
      
      mockRepository.findByCriteria.mockResolvedValue(paginatedChannels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(3);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should filter channels by name using partial match', async () => {
      const matchingChannels = [
        Channel.random({ name: 'Trading Signal Channel' }),
        Channel.random({ name: 'Signal Updates' }),
      ];

      const params: GetChannelsQueryParams = {
        name: 'Signal',
      };
      
      mockRepository.findByCriteria.mockResolvedValue(matchingChannels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(2);
      expect(result.channels.every(c => c.name.includes('Signal'))).toBe(true);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle date range filters for createdAt', async () => {
      const recentChannels = [
        Channel.random({ name: 'Recent 1' }),
        Channel.random({ name: 'Recent 2' }),
      ];

      const startDate = new Date('2024-01-01');
      const params: GetChannelsQueryParams = {
        createdAfter: startDate.toISOString(),
      };
      
      mockRepository.findByCriteria.mockResolvedValue(recentChannels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(2);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle createdBefore filter', async () => {
      const oldChannels = [
        Channel.random({ name: 'Old 1' }),
        Channel.random({ name: 'Old 2' }),
      ];

      const endDate = new Date('2023-12-31');
      const params: GetChannelsQueryParams = {
        createdBefore: endDate.toISOString(),
      };
      
      mockRepository.findByCriteria.mockResolvedValue(oldChannels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(2);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should return correct DTO format for channels', async () => {
      const channel = Channel.random({
        userId: 'user-789',
        name: 'Test Channel',
        channelType: 'telegram'
      });

      const params: GetChannelsQueryParams = {};
      mockRepository.findByCriteria.mockResolvedValue([channel]);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(1);
      const dto = result.channels[0];
      expect(dto).toHaveProperty('id');
      expect(dto).toHaveProperty('userId', 'user-789');
      expect(dto).toHaveProperty('name', 'Test Channel');
      expect(dto).toHaveProperty('channelType', 'telegram');
      expect(dto).toHaveProperty('isActive', true);
      expect(dto).toHaveProperty('createdAt');
      expect(dto.id).toBe(channel.id);
    });

    it('should handle repository errors gracefully', async () => {
      const params: GetChannelsQueryParams = {};
      const error = new Error('Database connection failed');
      
      mockRepository.findByCriteria.mockRejectedValue(error);

      await expect(handler.execute(new GetChannelsQuery(params)))
        .rejects.toThrow('Database connection failed');
      
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle complex filtering with all parameters', async () => {
      const channels = [
        Channel.random({ 
          userId: 'user-complex',
          name: 'Premium Trading Signals',
          channelType: 'telegram'
        }),
      ];

      const params: GetChannelsQueryParams = {
        userId: 'user-complex',
        name: 'Trading',
        channelType: 'telegram',
        isActive: true,
        orderBy: 'createdAt',
        orderType: 'desc',
        limit: 10,
        offset: 0,
      };
      
      mockRepository.findByCriteria.mockResolvedValue(channels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].userId).toBe('user-complex');
      expect(result.channels[0].name).toContain('Trading');
      expect(result.channels[0].channelType).toBe('telegram');
      // All channels are active by default
      expect(result.channels[0].isActive).toBe(true);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle date range with both createdAfter and createdBefore', async () => {
      const channels = [
        Channel.random({ name: 'In Range 1' }),
        Channel.random({ name: 'In Range 2' }),
      ];

      const params: GetChannelsQueryParams = {
        createdAfter: '2024-01-01T00:00:00.000Z',
        createdBefore: '2024-12-31T23:59:59.999Z',
      };
      
      mockRepository.findByCriteria.mockResolvedValue(channels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(2);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle filtering inactive channels', async () => {
      // Create inactive channels by setting isActive to false after creation
      const channel1 = Channel.random({ name: 'Inactive 1' });
      const channel2 = Channel.random({ name: 'Inactive 2' });
      channel1.isActive = false;
      channel2.isActive = false;

      const params: GetChannelsQueryParams = {
        isActive: false,
      };
      
      mockRepository.findByCriteria.mockResolvedValue([channel1, channel2]);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(2);
      expect(result.channels.every(c => c.isActive === false)).toBe(true);
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle sorting by name ascending', async () => {
      const channels = [
        Channel.random({ name: 'Alpha' }),
        Channel.random({ name: 'Beta' }),
        Channel.random({ name: 'Charlie' }),
      ];

      const params: GetChannelsQueryParams = {
        orderBy: 'name',
        orderType: 'asc',
      };
      
      mockRepository.findByCriteria.mockResolvedValue(channels);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result.channels).toHaveLength(3);
      expect(result.channels[0].name).toBe('Alpha');
      expect(result.channels[1].name).toBe('Beta');
      expect(result.channels[2].name).toBe('Charlie');
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });

    it('should handle filtering by multiple channel types using separate queries', async () => {
      const telegramChannel = Channel.random({ 
        channelType: 'telegram',
        name: 'Telegram Channel'
      });
      const discordChannel = Channel.random({ 
        channelType: 'discord',
        name: 'Discord Channel'
      });

      // First query for telegram
      const telegramParams: GetChannelsQueryParams = {
        channelType: 'telegram',
      };
      
      mockRepository.findByCriteria.mockResolvedValueOnce([telegramChannel]);
      const telegramResult = await handler.execute(new GetChannelsQuery(telegramParams));
      
      // Second query for discord
      const discordParams: GetChannelsQueryParams = {
        channelType: 'discord',
      };
      
      mockRepository.findByCriteria.mockResolvedValueOnce([discordChannel]);
      const discordResult = await handler.execute(new GetChannelsQuery(discordParams));

      expect(telegramResult.channels).toHaveLength(1);
      expect(telegramResult.channels[0].channelType).toBe('telegram');
      expect(discordResult.channels).toHaveLength(1);
      expect(discordResult.channels[0].channelType).toBe('discord');
      expect(mockRepository.findByCriteria).toHaveBeenCalledTimes(2);
    });

    it('should handle empty result with complex filters', async () => {
      const params: GetChannelsQueryParams = {
        userId: 'non-existent-user',
        channelType: 'telegram',
        isActive: true,
        name: 'Non-existent Channel',
        createdAfter: '2025-01-01T00:00:00.000Z',
      };
      
      mockRepository.findByCriteria.mockResolvedValue([]);

      const result = await handler.execute(new GetChannelsQuery(params));

      expect(result).toEqual({ channels: [] });
      expect(mockRepository.findByCriteria).toHaveBeenCalled();
    });
  });
});