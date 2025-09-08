import { IntegrationEventPublisher } from '@libs/nestjs-common';
import { Injectable } from '@nestjs/common';
import { CorrelationLogger } from '@libs/nestjs-common';

import { KafkaService } from './kafka-service';

@Injectable()
export class KafkaIntegrationEventPublisher implements IntegrationEventPublisher {
  private readonly logger = new CorrelationLogger(KafkaIntegrationEventPublisher.name);

  constructor(private readonly kafkaService: KafkaService) {}

  async publish(topic: string, message: string): Promise<void> {
    try {
      const producer = this.kafkaService.getProducer();
      await producer.send({
        topic,
        messages: [
          {
            value: message,
            timestamp: Date.now().toString(),
          },
        ],
      });
      this.logger.debug(`Event published to Kafka topic ${topic}. Message: ${message}`);
    } catch (error) {
      this.logger.error(`Failed to publish event to Kafka topic ${topic}:`, error as Error);
      throw error;
    }
  }
}
