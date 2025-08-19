import { Injectable, Logger } from '@nestjs/common';
import { IntegrationEventPublisher } from '@libs/nestjs-common';
import { KafkaService } from './kafka-service';

/**
 * Kafka implementation of EventPublisher interface.
 * Provides type-safe event publishing through Kafka.
 */
@Injectable()
export class KafkaIntegrationEventPublisher implements IntegrationEventPublisher {
  private readonly logger = new Logger(KafkaIntegrationEventPublisher.name);

  constructor(private readonly kafkaService: KafkaService) {}

  async publish(topic: string, message: any): Promise<void> {
    try {
      await this.kafkaService.publishMessage(topic, message);
      this.logger.debug(`Event published to Kafka topic ${topic}: ${message.eventName || 'unknown'}`);
    } catch (error) {
      this.logger.error(`Failed to publish event to Kafka topic ${topic}:`, error);
      throw error;
    }
  }

  async publishBatch(topic: string, messages: any[]): Promise<void> {
    try {
      await this.kafkaService.publishMessages(topic, messages);
      this.logger.debug(`${messages.length} events published to Kafka topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish batch events to Kafka topic ${topic}:`, error);
      throw error;
    }
  }
}