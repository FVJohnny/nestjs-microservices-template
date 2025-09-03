import { BaseIntegrationEventListener, type ParsedIntegrationMessage } from '@libs/nestjs-common';
import { Injectable } from '@nestjs/common';

import { KafkaMessage } from './kafka.types';
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

  protected async subscribeToTopic(topicName: string): Promise<void> {
    await this.kafkaService.registerHandler({
      topicName,
      handle: async (kafkaMessage: unknown) => {
        await this.handleMessage(topicName, kafkaMessage);
      }
    });
    this.logger.log(`Subscribed to Kafka topic: ${topicName}`);
  }

  protected async unsubscribeFromTopic(topicName: string): Promise<void> {
    // Note: KafkaService doesn't currently support unregistering handlers
    this.logger.log(`Unsubscribed from Kafka topic: ${topicName}`);
  }

  protected parseMessage(message: KafkaMessage): ParsedIntegrationMessage {
    try {
      // Extract message data from Kafka message format
      const messageValue = message.message.value?.toString();
      const messageKey = message.message.key?.toString();
      
      const messageId = messageKey || `kafka-${Date.now()}`;
      const parsedMessage = JSON.parse(messageValue || '{}');

      return { parsedMessage, messageId };
    } catch (error) {
      this.logger.error(`Error parsing Kafka message: ${error}`);
      throw error;
    }
  }
}