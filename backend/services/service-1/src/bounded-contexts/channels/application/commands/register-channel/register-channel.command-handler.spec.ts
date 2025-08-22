import { RegisterChannelCommandHandler } from './register-channel.command-handler';
import { RegisterChannelCommand } from './register-channel.command';
import type { RegisterChannelCommandProps } from './register-channel.command';
import { InMemoryChannelRepository } from '../../../infrastructure/repositories/in-memory/in-memory-channel.repository';
import { ChannelRegisteredDomainEvent } from '../../../domain/events/channel-registered.domain-event';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelType } from '../../../domain/value-objects/channel-type.vo';
import { ICommandHandler } from '@nestjs/cqrs';
import { createTestingModule, TestModule } from '../../../../../testing';

describe('RegisterChannelCommandHandler', () => {
  
  describe('when registering a valid channel', () => {
    it('should save the channel to the repository with correct properties', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const command = createCommand({
        channelType: ChannelType.TELEGRAM,
        name: 'Production Channel',
        userId: 'user-123',
        connectionConfig: { token: 'secure-token', webhook: 'https://api.telegram.org' }
      });

      // Act
      const result = await testModule.commandHandler.execute(command);

      // Assert
      const savedChannel = await testModule.repository.findById(result.id);
      expect(savedChannel).toBeDefined();
      expect(savedChannel?.name).toBe('Production Channel');
      expect(savedChannel?.channelType.getValue()).toBe(ChannelType.TELEGRAM);
      expect(savedChannel?.userId).toBe('user-123');
      expect(savedChannel?.connectionConfig).toEqual({
        token: 'secure-token',
        webhook: 'https://api.telegram.org'
      });
    });

    it('should emit a ChannelRegisteredDomainEvent with correct data', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const command = createCommand({
        channelType: ChannelType.DISCORD,
        name: 'Gaming Channel',
        userId: 'gamer-456'
      });

      // Act
      const result = await testModule.commandHandler.execute(command);

      // Assert
      const emittedEvents = testModule.eventBus.events;
      expect(emittedEvents).toHaveLength(1);
      
      const event = emittedEvents[0];
      expect(event).toBeInstanceOf(ChannelRegisteredDomainEvent);
      expect(event.aggregateId).toBe(result.id);
      expect(event.channelName).toBe('Gaming Channel');
      expect(event.channelType.getValue()).toBe(ChannelType.DISCORD);
      expect(event.userId).toBe('gamer-456');
      expect(event.occurredOn).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for each registered channel', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const commands = [
        createCommand({ name: 'Channel 1' }),
        createCommand({ name: 'Channel 2' }),
        createCommand({ name: 'Channel 3' })
      ];

      // Act
      const results = await Promise.all(
        commands.map(cmd => testModule.commandHandler.execute(cmd))
      );

      // Assert
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
      expect(ids.every(id => id && id.length > 0)).toBe(true);
    });
  });

  describe('when registering channels with different types', () => {
    const channelTypes = Object.values(ChannelType);

    it.each(channelTypes)('should successfully register a %s channel', async (channelType) => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const command = createCommand({
        channelType,
        name: `${channelType} Channel`,
        connectionConfig: { type: channelType }
      });

      // Act
      const result = await testModule.commandHandler.execute(command);

      // Assert
      const savedChannel = await testModule.repository.findById(result.id);
      expect(savedChannel).toBeDefined();
      expect(savedChannel?.channelType.getValue()).toBe(channelType);
      
      const event = testModule.eventBus.events[0];
      expect(event.channelType.getValue()).toBe(channelType);
    });
  });

  describe('when handling edge cases', () => {
    it('should handle empty connection configuration', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const command = createCommand({
        connectionConfig: {}
      });

      // Act
      const result = await testModule.commandHandler.execute(command);

      // Assert
      const savedChannel = await testModule.repository.findById(result.id);
      expect(savedChannel).toBeDefined();
      expect(savedChannel?.connectionConfig).toEqual({});
    });

    it('should handle channel names with special characters', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const specialName = '🚀 Channel #1 - Test & Production (Dev)';
      const command = createCommand({
        name: specialName
      });

      // Act
      const result = await testModule.commandHandler.execute(command);

      // Assert
      const savedChannel = await testModule.repository.findById(result.id);
      expect(savedChannel?.name).toBe(specialName);
    });

    it('should handle very long channel names', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const longName = 'A'.repeat(500);
      const command = createCommand({
        name: longName
      });

      // Act
      const result = await testModule.commandHandler.execute(command);

      // Assert
      const savedChannel = await testModule.repository.findById(result.id);
      expect(savedChannel?.name).toBe(longName);
    });

    it('should handle complex nested connection configuration', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const complexConfig = {
        token: 'main-token',
        credentials: {
          apiKey: 'key-123',
          apiSecret: 'secret-456',
          nested: {
            endpoint: 'https://api.example.com',
            version: 'v2',
            features: ['feature1', 'feature2']
          }
        },
        settings: {
          retryCount: 3,
          timeout: 5000,
          enableLogging: true
        }
      };
      const command = createCommand({
        connectionConfig: complexConfig
      });

      // Act
      const result = await testModule.commandHandler.execute(command);

      // Assert
      const savedChannel = await testModule.repository.findById(result.id);
      expect(savedChannel?.connectionConfig).toEqual(complexConfig);
    });
  });

  describe('when event publishing fails', () => {
    it('should throw an error and not save any events', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: true });
      const command = createCommand();

      // Act & Assert
      await expect(testModule.commandHandler.execute(command))
        .rejects
        .toThrow('error test');

      expect(testModule.eventBus.events).toHaveLength(0);
    });

    it('should save the channel but fail before committing events when event publishing fails', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: true });
      const command = createCommand({
        name: 'Failed Channel'
      });

      // Act & Assert
      await expect(testModule.commandHandler.execute(command))
        .rejects
        .toThrow('error test');

      // Assert - verify the channel was saved (handler saves before publishing events)
      const allChannels = await testModule.repository.findAll();
      expect(allChannels).toHaveLength(1);
      expect(allChannels[0].name).toBe('Failed Channel');
      
      // But no events should be in the event bus
      expect(testModule.eventBus.events).toHaveLength(0);
    });
  });

  describe('when handling concurrent registrations', () => {
    it('should handle multiple simultaneous channel registrations', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const commands = Array.from({ length: 10 }, (_, i) => 
        createCommand({
          name: `Concurrent Channel ${i}`,
          userId: `user-${i}`
        })
      );

      // Act
      const results = await Promise.all(
        commands.map(cmd => testModule.commandHandler.execute(cmd))
      );

      // Assert
      expect(results).toHaveLength(10);
      expect(testModule.eventBus.events).toHaveLength(10);
      
      const allChannels = await testModule.repository.findAll();
      expect(allChannels).toHaveLength(10);
      
      // Verify all channels have unique IDs
      const ids = new Set(results.map(r => r.id));
      expect(ids.size).toBe(10);
    });
  });

  describe('when validating channel properties', () => {
    it('should preserve all channel properties through the registration process', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const testData: RegisterChannelCommandProps = {
        channelType: ChannelType.WHATSAPP,
        name: 'Customer Support',
        userId: 'support-team-789',
        connectionConfig: {
          phoneNumber: '+1234567890',
          businessId: 'biz-123',
          apiEndpoint: 'https://api.whatsapp.com'
        }
      };
      const command = createCommand(testData);

      // Act
      const result = await testModule.commandHandler.execute(command);

      // Assert - verify all properties are preserved
      const savedChannel = await testModule.repository.findById(result.id);
      expect(savedChannel).toBeDefined();
      expect({
        channelType: savedChannel?.channelType.getValue(),
        name: savedChannel?.name,
        userId: savedChannel?.userId,
        connectionConfig: savedChannel?.connectionConfig
      }).toEqual(testData);
    });

    it('should set creation timestamp on the channel', async () => {
      // Arrange
      const testModule = await setupTestingModule({ shouldDomainEventPublishFail: false });
      const beforeCreation = new Date();
      const command = createCommand();

      // Act
      const result = await testModule.commandHandler.execute(command);
      const afterCreation = new Date();

      // Assert
      const savedChannel = await testModule.repository.findById(result.id);
      expect(savedChannel?.createdAt).toBeInstanceOf(Date);
      expect(savedChannel?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(savedChannel?.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });
});

// Helper functions with proper typing
function createCommand(overrides: Partial<RegisterChannelCommandProps> = {}): RegisterChannelCommand {
  const props: RegisterChannelCommandProps = {
    channelType: overrides.channelType ?? ChannelType.TELEGRAM,
    name: overrides.name ?? 'Test Channel',
    userId: overrides.userId ?? 'test-user',
    connectionConfig: overrides.connectionConfig ?? { token: 'test-token' }
  };
  return new RegisterChannelCommand(props);
}

async function setupTestingModule(options: { shouldDomainEventPublishFail: boolean }): Promise<TestModule<ICommandHandler, InMemoryChannelRepository>> {
  const module = await createTestingModule({
    commands: {
      commandHandler: RegisterChannelCommandHandler,
    },
    events: {
      shouldDomainEventPublishFail: options.shouldDomainEventPublishFail,
    },
    repositories: { 
      name: 'ChannelRepository', 
      repository: InMemoryChannelRepository 
    }
  });

  // Type assertion with validation
  if (!module.commandHandler) {
    throw new Error('Command handler not initialized');
  }
  if (!module.repository) {
    throw new Error('Repository not initialized');
  }

  return {
    eventBus: module.eventBus as any, // Still needs casting but at least typed in interface
    commandHandler: module.commandHandler,
    repository: module.repository as InMemoryChannelRepository
  };
}