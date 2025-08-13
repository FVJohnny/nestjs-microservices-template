import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KafkaConsumerService, KafkaConsumerServiceConfig, KafkaPublisherService } from '@libs/nestjs-kafka';

/**
 * Generic Kafka service for Service-1.
 * Provides both consumer (for incoming messages) and publisher (for outgoing events) functionality.
 * Can be used by any bounded context in the application.
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafkaConsumer: KafkaConsumerService;
  private kafkaPublisher: KafkaPublisherService;
  private handlers: any[] = [];
  private initialized = false;
  
  constructor() {
    // Consumer configuration
    const consumerConfig: KafkaConsumerServiceConfig = {
      clientId: 'service-1-consumer',
      groupId: 'service-1-consumer-group',
      retryDelayMs: 5000,
    };
    
    // Publisher configuration
    const publisherConfig = {
      clientId: 'service-1-publisher',
      groupId: 'service-1-publisher-group',
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
    console.log(`✅ Service-1 Kafka setup complete: ${this.kafkaConsumer.getStats().handlerCount} handlers`);
  }

  async onModuleDestroy() {
    // Clean up both consumer and publisher
    await Promise.all([
      this.kafkaConsumer.onModuleDestroy(),
      this.kafkaPublisher.onModuleDestroy()
    ]);
  }

  // Expose consumer stats for the test controller
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

  // Expose publisher for dependency injection (legacy support)
  getPublisher(): KafkaPublisherService {
    return this.kafkaPublisher;
  }
}