import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import type { KafkaGenericHandler } from './kafka.types';
import { createKafkaServiceConfig } from './kafka-config.helper';
import { KafkaConsumerService, KafkaConsumerServiceConfig } from './kafka-consumer.service';
import { KafkaPublisherService } from './kafka-publisher.service';

export interface KafkaServiceConfig {
  clientId: string;
  groupId: string;
  retryDelayMs?: number;
}

/**
 * Generic Kafka service that provides both consumer and publisher functionality.
 * Can be used by any NestJS service that needs Kafka integration.
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafkaConsumer: KafkaConsumerService;
  private kafkaPublisher: KafkaPublisherService;
  private config: KafkaServiceConfig;
  private readonly logger = new Logger(KafkaService.name);
  
  
  constructor() {
    this.config = createKafkaServiceConfig();
    
    // Consumer configuration
    const consumerConfig: KafkaConsumerServiceConfig = {
      clientId: `${this.config.clientId}-consumer`,
      groupId: `${this.config.groupId}-consumer-group`,
      retryDelayMs: this.config.retryDelayMs || 5000,
    };
    
    // Publisher configuration
    const publisherConfig = {
      clientId: `${this.config.clientId}-publisher`,
      groupId: `${this.config.groupId}-publisher-group`,
    };
    
    this.kafkaConsumer = new KafkaConsumerService(consumerConfig);
    this.kafkaPublisher = new KafkaPublisherService(publisherConfig);
  }



  async onModuleInit() {
    await Promise.all([
      this.kafkaConsumer.onModuleInit(),
      this.kafkaPublisher.onModuleInit()
    ]);
  }

  async onModuleDestroy() {
    await Promise.all([
      this.kafkaConsumer.onModuleDestroy(),
      this.kafkaPublisher.onModuleDestroy()
    ]);
  }

  /**
   * Register a handler to be used when the service initializes
   */
  async registerHandler(handler: KafkaGenericHandler): Promise<void> {
    this.kafkaConsumer.registerHandler(handler);
  }



  // Expose consumer stats for monitoring
  getConsumerStats() {
    return this.kafkaConsumer.getStats();
  }

  // Publishing methods
  async publishMessage(topic: string, message: string): Promise<void> {
    return this.kafkaPublisher.publishMessage(topic, message);
  }

}