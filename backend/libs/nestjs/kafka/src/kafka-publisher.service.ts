import { Inject, Injectable, Logger,OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

import { KafkaModuleOptions } from './interfaces/kafka-config.interface';
import { createKafkaConfig } from './kafka-config.helper';

@Injectable()
export class KafkaPublisherService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  private readonly logger = new Logger(KafkaPublisherService.name);

  constructor(
    @Inject('KAFKA_OPTIONS') private readonly options: KafkaModuleOptions,
  ) {
    
    // Use shared configuration helper
    const kafkaConfig = createKafkaConfig(this.options.clientId, this.options.brokers);

    // Override with explicit config if provided
    if (this.options.ssl !== undefined) {
      kafkaConfig.ssl = this.options.ssl;
    }
    if (this.options.sasl) {
      kafkaConfig.sasl = this.options.sasl;
    }

    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    this.logger.log(`[${this.options.clientId}] Starting Kafka producer connection...`);
    await this.producer.connect();
    this.logger.log(`[${this.options.clientId}] Producer connected`);
  }


  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.log(`[${this.options.clientId}] Kafka disconnected`);
  }

  async publishMessage(topic: string, message: string) {
    await this.producer.send({
      topic,
      messages: [
        {
          value: message,
          timestamp: Date.now().toString(),
        },
      ],
    });
    this.logger.log(`[${this.options.clientId}] Published message to ${topic}:`, message);
  }

}
