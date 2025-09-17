import { BaseIntegrationEventListener, type ParsedIntegrationMessage } from '@libs/nestjs-common';
import { Injectable } from '@nestjs/common';
import { type KafkaMessage } from 'kafkajs';

import { KafkaService } from './kafka-service';

@Injectable()
export class KafkaIntegrationEventListener extends BaseIntegrationEventListener {
  constructor(private readonly kafkaService: KafkaService) {
    super();
  }

  protected async subscribeToTopic(topicName: string) {
    this.logger.log(`Subscribing to Kafka topic: ${topicName}`);
    const consumer = this.kafkaService.getConsumer();
    await consumer.subscribe({ topic: topicName });
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        await this.handleMessage(topic, this.parseMessage(message));
      },
    });
    this.logger.log(`Subscribed to Kafka topic: ${topicName}`);
  }

  protected async unsubscribeFromTopic(topicName: string) {
    // Note: KafkaService doesn't currently support unregistering handlers
    this.logger.log(`Unsubscribed from Kafka topic: ${topicName}`);
  }

  protected parseMessage(message: KafkaMessage): ParsedIntegrationMessage {
    try {
      const messageValue = message.value?.toString();
      const messageKey = message.key?.toString();

      const messageId = messageKey || `kafka-${Date.now()}`;
      const parsedMessage = JSON.parse(messageValue || '{}');

      return { id: messageId, name: parsedMessage.name, ...parsedMessage };
    } catch (error) {
      this.logger.error(`Error parsing Kafka message: ${error}`);
      throw error;
    }
  }
}
