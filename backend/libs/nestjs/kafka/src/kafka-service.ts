import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
  private handlers: any[] = [];
  private initialized = false;
  private config: KafkaServiceConfig;
  
  constructor(config: KafkaServiceConfig) {
    this.config = config;
    
    // Consumer configuration
    const consumerConfig: KafkaConsumerServiceConfig = {
      clientId: `${config.clientId}-consumer`,
      groupId: `${config.groupId}-consumer-group`,
      retryDelayMs: config.retryDelayMs || 5000,
    };
    
    // Publisher configuration
    const publisherConfig = {
      clientId: `${config.clientId}-publisher`,
      groupId: `${config.groupId}-publisher-group`,
    };
    
    this.kafkaConsumer = new KafkaConsumerService(consumerConfig);
    this.kafkaPublisher = new KafkaPublisherService(publisherConfig);
  }

  /**
   * Register a handler to be used when the service initializes
   */
  registerHandler(handler: any) {
    this.handlers.push(handler);
    
    // If already initialized, register immediately
    if (this.initialized) {
      this.kafkaConsumer.registerHandler(handler);
    }
  }

  async onModuleInit() {
    // Initialize both consumer and publisher
    await Promise.all([
      this.kafkaConsumer.onModuleInit(),
      this.kafkaPublisher.onModuleInit()
    ]);
    
    // Register all collected handlers
    for (const handler of this.handlers) {
      this.kafkaConsumer.registerHandler(handler);
    }
    
    // Subscribe to registered topics
    if (this.handlers.length > 0) {
      await this.kafkaConsumer.subscribeToRegisteredTopics();
    }
    
    this.initialized = true;
    console.log(`✅ ${this.config.clientId} Kafka setup complete: ${this.kafkaConsumer.getStats().handlerCount} handlers`);
  }

  async onModuleDestroy() {
    // Clean up both consumer and publisher
    await Promise.all([
      this.kafkaConsumer.onModuleDestroy(),
      this.kafkaPublisher.onModuleDestroy()
    ]);
  }

  // Expose consumer stats for monitoring
  getConsumerStats() {
    return this.kafkaConsumer.getStats();
  }

  // Publishing methods
  async publishMessage(topic: string, message: any): Promise<void> {
    return this.kafkaPublisher.publishMessage(topic, message);
  }

  async publishMessages(topic: string, messages: any[]): Promise<void> {
    return this.kafkaPublisher.publishMessages(topic, messages);
  }

  // Expose publisher for legacy support
  getPublisher(): KafkaPublisherService {
    return this.kafkaPublisher;
  }
}