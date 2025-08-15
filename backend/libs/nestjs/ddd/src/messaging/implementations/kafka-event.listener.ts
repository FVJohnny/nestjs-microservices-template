import { Injectable } from '@nestjs/common';
import { BaseEventListener } from './base-event.listener';

// Use type instead of import to avoid circular dependency issues
type KafkaService = any;

/**
 * Kafka implementation of EventListener
 * Adapts Kafka messages to the generic format and routes them to event handlers
 */
@Injectable()
export class KafkaEventListener extends BaseEventListener {
  constructor(private readonly kafkaService: KafkaService) {
    super();
  }

  protected async subscribeToTopic(topicName: string): Promise<void> {
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
