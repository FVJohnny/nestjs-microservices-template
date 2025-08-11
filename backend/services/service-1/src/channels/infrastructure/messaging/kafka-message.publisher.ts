import { Injectable, Logger, Inject } from '@nestjs/common';
import { KafkaService } from '@libs/nestjs-kafka';
import { KafkaMessagePublisher } from '../../application/events/channel-registered.handler';

@Injectable()
export class KafkaMessagePublisherImpl implements KafkaMessagePublisher {
  private readonly logger = new Logger(KafkaMessagePublisherImpl.name);

  constructor(
    @Inject('SHARED_KAFKA_SERVICE') 
    private readonly kafkaService: KafkaService
  ) {}

  async publish(topic: string, message: any): Promise<void> {
    try {
      await this.kafkaService.publishMessage(topic, message);
      this.logger.log(`Message published to topic ${topic}: ${message.eventName}`);
    } catch (error) {
      this.logger.error(`Failed to publish message to topic ${topic}:`, error);
      throw error;
    }
  }
}
