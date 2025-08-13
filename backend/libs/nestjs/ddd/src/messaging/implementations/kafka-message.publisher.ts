import { Injectable, Logger } from '@nestjs/common';
import { MessagePublisher } from '../interfaces/message-publisher.interface';

/**
 * Kafka implementation of MessagePublisher interface.
 * This implementation directly injects KafkaPublisherService.
 */
@Injectable()
export class KafkaMessagePublisher implements MessagePublisher {
  private readonly logger = new Logger(KafkaMessagePublisher.name);

  constructor(private readonly kafkaService: any) {} // Will be provided via module configuration

  async publish(topic: string, message: any): Promise<void> {
    try {
      await this.kafkaService.publishMessage(topic, message);
      this.logger.debug(`Message published to Kafka topic ${topic}: ${message.eventName || 'unknown'}`);
    } catch (error) {
      this.logger.error(`Failed to publish message to Kafka topic ${topic}:`, error);
      throw error;
    }
  }

  async publishBatch(topic: string, messages: any[]): Promise<void> {
    try {
      await this.kafkaService.publishMessages(topic, messages);
      this.logger.debug(`${messages.length} messages published to Kafka topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish batch messages to Kafka topic ${topic}:`, error);
      throw error;
    }
  }
}
