import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CorrelationLogger } from '@libs/nestjs-common';
import { KafkaTopicHandler, KafkaMessagePayload } from '@libs/nestjs-kafka';
import { KafkaService } from '@libs/nestjs-kafka';

@Injectable()
export class UserEventsHandler implements KafkaTopicHandler, OnModuleInit {
  readonly topicName = 'user-events';
  private readonly logger = new CorrelationLogger(UserEventsHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    await this.kafkaService.registerHandler(this);
  }

  async handle(payload: KafkaMessagePayload): Promise<void> {
    try {
      const messageValue = payload.message.value;
      if (!messageValue) {
        this.logger.warn('Received empty message from user-events topic');
        return;
      }

      const parsedMessage = JSON.parse(messageValue);
      this.logger.debug(`Received user event: ${JSON.stringify(parsedMessage)}`);

      const { eventType, userId, data } = parsedMessage;

      switch (eventType) {
        case 'USER_REGISTERED':
          await this.handleUserRegistered(userId, data);
          break;
        
        case 'USER_PREFERENCES_UPDATED':
          await this.handleUserPreferencesUpdated(userId, data);
          break;

        default:
          this.logger.warn(`Unknown event type in user-events: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(`Error processing user-events message: ${error}`);
      throw error;
    }
  }

  private async handleUserRegistered(userId: string, data: any): Promise<void> {
    this.logger.log(`Handling user registration - User ID: ${userId}`);
    // TODO: Implement user registration logic
    // Example: Create default channels for new user
  }

  private async handleUserPreferencesUpdated(userId: string, data: any): Promise<void> {
    this.logger.log(`Handling user preferences update - User ID: ${userId}`);
    // TODO: Implement preferences update logic
    // Example: Update channel notification settings
  }
}