import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelationLogger } from '@libs/nestjs-common';
import { KafkaEventHandler } from '@libs/nestjs-kafka';
import { RegisterChannelCommand } from '../../../../../../application/commands/register-channel.command';

@Injectable()
export class ChannelCreateEventHandler implements KafkaEventHandler {
  readonly eventName = 'channel.create';
  private readonly logger = new CorrelationLogger(ChannelCreateEventHandler.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(payload: Record<string, unknown>, messageId: string): Promise<void> {
    this.logger.log(`Processing channel.create event [${messageId}]`);

    try {
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
      this.logger.error(
        `❌ Failed to process channel.create event [${messageId}]: ${error}`,
      );
      throw error; // Re-throw to trigger retry mechanism
    }
  }
}
