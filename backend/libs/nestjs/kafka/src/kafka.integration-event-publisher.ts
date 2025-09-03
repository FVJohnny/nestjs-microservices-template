import { IntegrationEventPublisher } from '@libs/nestjs-common';
import { Injectable, Logger } from '@nestjs/common';

import { KafkaService } from './kafka-service';

/**
 * Kafka implementation of EventPublisher interface.
 * Provides type-safe event publishing through Kafka.
 */
@Injectable()
export class KafkaIntegrationEventPublisher implements IntegrationEventPublisher {
  private readonly logger = new Logger(KafkaIntegrationEventPublisher.name);

  constructor(private readonly kafkaService: KafkaService) {}

  async publish(topic: string, message: string): Promise<void> {
    try {
      await this.kafkaService.publishMessage(topic, message);
      this.logger.debug(`Event published to Kafka topic ${topic}`, JSON.parse(message));
    } catch (error) {
      this.logger.error(`Failed to publish event to Kafka topic ${topic}:`, error);
      throw error;
    }
  }
}