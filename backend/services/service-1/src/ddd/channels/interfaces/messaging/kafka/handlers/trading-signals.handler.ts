import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelationLogger } from '@libs/nestjs-common';
import { KafkaTopicHandler, KafkaMessagePayload } from '@libs/nestjs-kafka';
import { KafkaService } from '@libs/nestjs-kafka';
import { RegisterChannelCommand } from '../../../../application/commands/register-channel.command';
import { ProcessSignalCommand } from '../../../../application/commands/process-signal.command';

@Injectable()
export class TradingSignalsHandler implements KafkaTopicHandler, OnModuleInit {
  readonly topicName = 'trading-signals';
  private readonly logger = new CorrelationLogger(TradingSignalsHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    this.kafkaService.registerHandler(this);
  }

  async handle(payload: KafkaMessagePayload): Promise<void> {
    const startTime = Date.now();
    let messageId = 'unknown';
    
    try {
      const messageValue = payload.message.value;
      if (!messageValue) {
        this.logger.warn('Received empty message from trading-signals topic ');
        return;
      }

      const parsedMessage = JSON.parse(messageValue);
      messageId = parsedMessage.messageId || payload.message.offset;
      
      this.logger.debug(`Processing trading signal [${messageId}]: ${JSON.stringify(parsedMessage)}`);

      const { action, payload: actionPayload } = parsedMessage;

      switch (action) {
        case 'CREATE_CHANNEL':
          await this.handleCreateChannel(actionPayload, messageId);
          break;
        
        case 'PROCESS_SIGNAL':
          await this.handleProcessSignal(actionPayload, messageId);
          break;

        default:
          this.logger.warn(`Unknown action in trading-signals [${messageId}]: ${action}`);
          return; // Don't throw for unknown actions
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Successfully processed trading signal [${messageId}] in ${processingTime}ms`);
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Error processing trading-signals message [${messageId}] after ${processingTime}ms: ${error}`);
      
      // For some errors, we might want to retry, for others we might want to skip
      if (this.isRetriableError(error)) {
        throw error; // Re-throw to trigger retry
      } else {
        // Log and skip non-retriable errors
        this.logger.error(`Non-retriable error, skipping message [${messageId}]: ${error}`);
      }
    }
  }

  private async handleCreateChannel(payload: any, messageId: string): Promise<void> {
    const { channelType, name, userId, connectionConfig } = payload;
    
    this.logger.log(`Creating channel from Kafka [${messageId}] - Type: ${channelType}, Name: ${name}`);

    const command = new RegisterChannelCommand(
      channelType,
      name,
      userId,
      connectionConfig,
    );

    const channelId = await this.commandBus.execute(command);
    this.logger.log(`Channel created from Kafka event [${messageId}] - ID: ${channelId}`);
  }

  private async handleProcessSignal(payload: any, messageId: string): Promise<void> {
    const { channelId, signalType, signalData } = payload;
    
    this.logger.log(`Processing signal [${messageId}] - Channel: ${channelId}, Type: ${signalType}`);

    const command = new ProcessSignalCommand(
      channelId,
      signalType,
      signalData,
    );

    await this.commandBus.execute(command);
    this.logger.log(`Signal processed successfully [${messageId}]`);
  }

  private isRetriableError(error: any): boolean {
    // Define which errors should trigger retries
    const retriableErrors = [
      'ECONNRESET',
      'ECONNREFUSED', 
      'ETIMEDOUT',
      'Connection refused',
      'Database connection error',
    ];

    const errorMessage = error?.message || error?.toString() || '';
    return retriableErrors.some(pattern => errorMessage.includes(pattern));
  }
}