import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelationLogger } from '@libs/nestjs-common';
import { KafkaTopicHandler, KafkaMessagePayload } from '@libs/nestjs-kafka';
import { KafkaService } from '@libs/nestjs-kafka';
import { RegisterChannelCommand } from '../../../../application/commands/register-channel.command';

@Injectable()
export class TradingSignalsHandler implements KafkaTopicHandler, OnModuleInit {
  readonly topicName = 'trading-signals';
  private readonly logger = new CorrelationLogger(TradingSignalsHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    await this.kafkaService.registerHandler(this);
  }

  async handle(payload: KafkaMessagePayload): Promise<void> {
    let messageId = 'unknown';

    try {
      const messageValue = payload.message.value;
      if (!messageValue) {
        this.logger.warn('Received empty message from trading-signals topic ');
        return;
      }

      const parsedMessage = JSON.parse(messageValue) as Record<string, unknown>;
      messageId = (parsedMessage.messageId as string) || payload.message.offset;

      this.logger.debug(
        `Received Kafka Event - trading-signals [${messageId}]: ${JSON.stringify(parsedMessage)}`,
      );

      await this.handleCreateChannel(parsedMessage, messageId);
    } catch (error) {
      this.logger.error(
        `❌ Error processing trading-signals message [${messageId}]: ${error}`,
      );

      // For some errors, we might want to retry, for others we might want to skip
      if (this.isRetriableError(error)) {
        throw error; // Re-throw to trigger retry
      } else {
        // Log and skip non-retriable errors
        this.logger.error(
          `Non-retriable error, skipping message [${messageId}]: ${error}`,
        );
      }
    }
  }

  private async handleCreateChannel(
    payload: Record<string, unknown>,
    messageId: string,
  ): Promise<void> {
    const channelType = payload.channelType as string;
    const name = payload.name as string;
    const userId = payload.userId as string;
    const connectionConfig = payload.connectionConfig as Record<
      string,
      unknown
    >;

    this.logger.log(
      `Creating channel from Kafka event [${messageId}] - Type: ${channelType}, Name: ${name}`,
    );

    const command = new RegisterChannelCommand(
      channelType,
      name,
      userId,
      connectionConfig,
    );

    const channelId = await this.commandBus.execute(command);
    this.logger.log(
      `Channel created from Kafka event [${messageId}] - ID: ${channelId}`,
    );
  }

  private isRetriableError(error: unknown): boolean {
    // Define which errors should trigger retries
    const retriableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Connection refused',
      'Database connection error',
    ];

    const errorMessage = error instanceof Error ? error.message : String(error);
    return retriableErrors.some((pattern) => errorMessage.includes(pattern));
  }
}
