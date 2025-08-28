import { Injectable } from '@nestjs/common';
import { BaseIntegrationEventListener } from '@libs/nestjs-common';
import { KafkaService } from './kafka-service';

/**
 * Kafka implementation of EventListener
 * Adapts Kafka messages to the generic format and routes them to event handlers
 */
@Injectable()
export class KafkaIntegrationEventListener extends BaseIntegrationEventListener {
  constructor(private readonly kafkaService: KafkaService) {
    super();
  }

  async onModuleInit() {
    await super.onModuleInit();
    // Auto-start listening when the module initializes
    // This ensures handlers registered in onModuleInit are ready
    this.logger.log(`KafkaIntegrationEventListener onModuleInit called, current handlers: ${this.eventHandlers.size}, isListening: ${this.isListeningFlag}`);
    setTimeout(async () => {
      this.logger.log(`KafkaIntegrationEventListener setTimeout callback executed, handlers: ${this.eventHandlers.size}, isListening: ${this.isListeningFlag}`);
      if (this.eventHandlers.size > 0 && !this.isListeningFlag) {
        this.logger.log(`Auto-starting listener with ${this.eventHandlers.size} registered handlers`);
        await this.startListening();
        this.logger.log(`KafkaIntegrationEventListener auto-start completed, isListening: ${this.isListeningFlag}`);
      } else {
        this.logger.log(`KafkaIntegrationEventListener auto-start skipped - handlers: ${this.eventHandlers.size}, already listening: ${this.isListeningFlag}`);
      }
    }, 100); // Small delay to allow all handlers to register
  }

  protected async subscribeToTopic(topicName: string): Promise<void> {
    // Log call stack to understand where this is being called from
    const stack = new Error().stack;
    const callerLine = stack?.split('\n')[2] || 'unknown';
    this.logger.debug(`subscribeToTopic called for ${topicName} from: ${callerLine.trim()}`);
    
    // Create a Kafka handler that delegates to our base handleMessage method
    const kafkaHandler = {
      topicName,
      handle: async (kafkaMessage: any) => {
        await this.handleMessage(topicName, kafkaMessage);
      }
    };

    // Register with the KafkaService
    this.kafkaService.registerHandler(kafkaHandler);
    this.logger.log(`Subscribed to Kafka topic: ${topicName}`);
  }

  protected async unsubscribeFromTopic(topicName: string): Promise<void> {
    // Note: KafkaService doesn't currently support unregistering handlers
    this.logger.log(`Unsubscribed from Kafka topic: ${topicName}`);
  }

  protected parseMessage(rawMessage: any): { parsedMessage: Record<string, unknown>; messageId: string } {
    try {
      // Extract message data from Kafka message format
      const actualMessage = rawMessage.message || rawMessage;
      const messageValue = actualMessage.value?.toString();
      const messageKey = actualMessage.key?.toString();
      
      const messageId = messageKey || `kafka-${Date.now()}`;
      const parsedMessage = messageValue ? JSON.parse(messageValue) : (actualMessage.value || {});

      return { parsedMessage, messageId };
    } catch (error) {
      this.logger.error(`Error parsing Kafka message: ${error}`);
      throw error;
    }
  }
}