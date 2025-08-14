import { Injectable, OnModuleInit } from '@nestjs/common';
import { CorrelationLogger } from '@libs/nestjs-common';
import { KafkaTopicHandler, KafkaMessagePayload, KafkaService } from '@libs/nestjs-kafka';
import { KafkaEventHandler, KafkaTopicEventRouter } from './kafka-event-handler.interface';

@Injectable()
export abstract class BaseTopicHandler implements KafkaTopicHandler, KafkaTopicEventRouter, OnModuleInit {
  abstract readonly topicName: string;
  protected readonly logger: CorrelationLogger;
  private readonly eventHandlers = new Map<string, KafkaEventHandler>();

  constructor(protected readonly kafkaService: KafkaService) {
    this.logger = new CorrelationLogger(this.constructor.name);
  }

  async onModuleInit() {
    await this.kafkaService.registerHandler(this);
  }

  registerEventHandler(handler: KafkaEventHandler): void {
    this.eventHandlers.set(handler.eventName, handler);
    this.logger.log(`Registered event handler for '${handler.eventName}' in topic '${this.topicName}'`);
  }

  async handle(payload: KafkaMessagePayload): Promise<void> {
    let messageId = 'unknown';

    try {
      const messageValue = payload.message.value;
      if (!messageValue) {
        this.logger.warn(`Received empty message from ${this.topicName} topic`);
        return;
      }

      const parsedMessage = JSON.parse(messageValue) as Record<string, unknown>;
      messageId = (parsedMessage.messageId as string) || payload.message.offset;
      const eventName = parsedMessage.eventName as string;

      this.logger.debug(
        `Received Kafka Event - ${this.topicName}/${eventName} [${messageId}]: ${JSON.stringify(parsedMessage)}`,
      );

      if (!eventName) {
        this.logger.error(`Missing eventName in message [${messageId}] from topic ${this.topicName}`);
        return;
      }

      await this.routeEvent(eventName, parsedMessage, messageId);
    } catch (error) {
      this.logger.error(
        `❌ Error processing ${this.topicName} message [${messageId}]: ${error}`,
      );

      if (this.isRetriableError(error)) {
        throw error; // Re-throw to trigger retry
      } else {
        this.logger.error(
          `Non-retriable error, skipping message [${messageId}]: ${error}`,
        );
      }
    }
  }

  async routeEvent(eventName: string, payload: Record<string, unknown>, messageId: string): Promise<void> {
    const handler = this.eventHandlers.get(eventName);
    
    if (!handler) {
      this.logger.warn(
        `No handler registered for event '${eventName}' in topic '${this.topicName}' [${messageId}]`
      );
      return;
    }

    try {
      await handler.handle(payload, messageId);
      this.logger.log(`Successfully processed ${this.topicName}/${eventName} [${messageId}]`);
    } catch (error) {
      this.logger.error(`Error in event handler for ${eventName} [${messageId}]: ${error}`);
      throw error; // Re-throw to maintain error handling behavior
    }
  }

  protected isRetriableError(error: unknown): boolean {
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
