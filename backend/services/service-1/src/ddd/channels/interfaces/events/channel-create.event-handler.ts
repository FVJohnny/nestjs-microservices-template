import { Injectable, Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { BaseEventHandler } from '@libs/nestjs-ddd';
import type { EventListener } from '@libs/nestjs-ddd';
import { RegisterChannelCommand } from '../../application/commands/register-channel.command';

@Injectable()
export class ChannelCreateEventHandler extends BaseEventHandler {
  readonly eventName = 'channel.create';
  readonly topicName = 'trading-signals';

  constructor(
    @Inject('EventListener') eventListener: EventListener,
    private readonly commandBus: CommandBus,
  ) {
    super(eventListener);
  }

  async handle(payload: Record<string, unknown>, messageId: string): Promise<void> {
    try {
      // Extract and validate payload
      const channelType = payload.channelType as string;
      const name = payload.name as string;
      const userId = payload.userId as string;
      const connectionConfig = payload.connectionConfig as Record<string, unknown>;

      // Validate required fields
      if (!channelType || !name || !userId) {
        throw new Error(`Missing required fields in channel.create event [${messageId}]`);
      }

      this.logger.log(
        `Creating channel from event [${messageId}] - Type: ${channelType}, Name: ${name}, User: ${userId}`,
      );

      const command = new RegisterChannelCommand({
        channelType,
        name,
        userId,
        connectionConfig: connectionConfig || {},
      });

      const channelId = await this.commandBus.execute(command);
      
      this.logger.log(
        `✅ Channel created successfully from event [${messageId}] - ID: ${channelId}`,
      );
    } catch (error) {
      this.logger.error(`❌ Failed to handle channel.create event [${messageId}]: ${error}`);
      throw error;
    }
  }
}
