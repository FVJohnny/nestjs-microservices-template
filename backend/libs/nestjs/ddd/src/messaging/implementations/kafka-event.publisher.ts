import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '../interfaces/event-publisher.interface';

/**
 * Kafka implementation of EventPublisher interface.
 * This implementation uses KafkaService directly for publishing.
 */
@Injectable()
export class KafkaEventPublisher implements EventPublisher {
  private readonly logger = new Logger(KafkaEventPublisher.name);

  constructor(private readonly kafkaService: any) {} // KafkaService injected via module configuration

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
