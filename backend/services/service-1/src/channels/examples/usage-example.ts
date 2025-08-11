/**
 * Example usage of the Channels Microservice
 * This demonstrates how to use the DDD/CQRS architecture
 */

import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RegisterChannelCommand } from '../application/commands/register-channel.command';
import { GetChannelsQuery } from '../application/queries/get-channels.query';
import { Channel } from '../domain/entities/channel.entity';

export class ChannelsUsageExample {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async demonstrateChannelRegistration() {
    // 1. Register a Telegram channel
    const telegramCommand = new RegisterChannelCommand(
      'telegram',
      'My Telegram Bot',
      'user-123',
      {
        botToken: 'your-telegram-bot-token',
        chatId: 'your-chat-id',
      }
    );

    const telegramChannelId = await this.commandBus.execute(telegramCommand);
    console.log(`Telegram channel registered with ID: ${telegramChannelId}`);

    // 2. Register a Discord channel
    const discordCommand = new RegisterChannelCommand(
      'discord',
      'My Discord Bot',
      'user-123',
      {
        botToken: 'your-discord-bot-token',
        guildId: 'your-guild-id',
        channelId: 'your-channel-id',
      }
    );

    const discordChannelId = await this.commandBus.execute(discordCommand);
    console.log(`Discord channel registered with ID: ${discordChannelId}`);

    // 3. Query all channels for a user
    const query = new GetChannelsQuery('user-123');
    const channels: Channel[] = await this.queryBus.execute(query);
    
    console.log(`Found ${channels.length} channels for user-123:`);
    channels.forEach(channel => {
      console.log(`- ${channel.name} (${channel.channelType.toString()})`);
    });

    return { telegramChannelId, discordChannelId };
  }

  async simulateMessageReceiving(channelId: string) {
    // In a real implementation, this would be triggered by external integrations
    // For example:
    // - Telegram webhook receives a message
    // - Discord bot receives a message event
    // - WhatsApp webhook receives a message
    
    // For demonstration, we'll show how a message would be processed:
    console.log(`Simulating message reception for channel: ${channelId}`);
    
    // This would typically happen in your integration layer:
    // 1. External service (Telegram, Discord, etc.) sends webhook/event
    // 2. Integration layer receives the message
    // 3. Integration layer calls channel.receiveMessage()
    // 4. Domain event is raised (MessageReceivedEvent)
    // 5. Event handler publishes to Kafka
    
    return {
      message: 'In real implementation, this would trigger MessageReceivedEvent',
      flow: [
        'External service webhook/event',
        'Integration layer processes',
        'Channel.receiveMessage() called',
        'MessageReceivedEvent raised',
        'Event handler publishes to Kafka',
      ]
    };
  }
}
