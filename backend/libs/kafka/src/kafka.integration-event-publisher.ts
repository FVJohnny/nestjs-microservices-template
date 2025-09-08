import { IntegrationEventPublisher } from "@libs/nestjs-common";
import { Injectable, Logger } from "@nestjs/common";

import { KafkaService } from "./kafka-service";

@Injectable()
export class KafkaIntegrationEventPublisher
  implements IntegrationEventPublisher
{
  private readonly logger = new Logger(KafkaIntegrationEventPublisher.name);

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
      this.logger.debug(
        `Event published to Kafka topic ${topic}`,
        JSON.parse(message),
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event to Kafka topic ${topic}:`,
        error,
      );
      throw error;
    }
  }
}
