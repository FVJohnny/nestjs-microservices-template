import { Injectable, OnModuleDestroy,OnModuleInit } from '@nestjs/common';

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
  private handlers: any[] = [];
  private initialized = false;
  private consumerInitializing = false;
  private consumerInitialized = false;
  private config: KafkaServiceConfig;
  private initializationTimeout: NodeJS.Timeout | null = null;
  
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

  /**
   * Register a handler to be used when the service initializes
   */
  async registerHandler(handler: any): Promise<void> {
    console.log(`🎯 KafkaService.registerHandler called for: ${handler.topicName}, current handlers: ${this.handlers.length}`);
    this.handlers.push(handler);
    
    // If KafkaService has started, schedule consumer initialization (debounced)
    if (this.initialized) {
      console.log(`⚡ KafkaService: Scheduling consumer initialization for new handler: ${handler.topicName}`);
      this.scheduleConsumerInitialization();
    } else {
      console.log(`⏳ KafkaService: Not initialized yet, storing handler: ${handler.topicName}`);
    }
  }

  private scheduleConsumerInitialization(): void {
    // Clear any existing timeout to debounce multiple handler registrations
    if (this.initializationTimeout) {
      clearTimeout(this.initializationTimeout);
    }
    
    // Schedule initialization after a short delay to allow all handlers to register
    this.initializationTimeout = setTimeout(() => {
      this.initializeConsumerIfNeeded().catch(error => {
        console.error(`❌ Scheduled consumer initialization failed: ${error}`);
      });
    }, 100); // 100ms debounce
  }

  async onModuleInit() {
    console.log(`🚀 ${this.config.clientId} KafkaService onModuleInit starting with ${this.handlers.length} handlers`);
    
    // Initialize publisher only (simpler and doesn't need handlers)
    await this.kafkaPublisher.onModuleInit();
    
    // Don't initialize consumer yet - wait for handlers to register
    // We'll start it when the first handler registers or after a delay
    
    this.initialized = true;
    console.log(`✅ ${this.config.clientId} KafkaService initialized (consumer will start when handlers register)`);
    
    // Start a delayed initialization to catch any late handlers (longer delay, only as fallback)
    setTimeout(() => {
      this.initializeConsumerIfNeeded().catch(error => {
        console.error(`❌ Delayed consumer initialization failed: ${error}`);
      });
    }, 2000); // 2 second delay as fallback
  }

  private async initializeConsumerIfNeeded(): Promise<void> {
    // Check if consumer is already ready or initializing
    if (this.consumerInitialized || this.kafkaConsumer.isReady()) {
      console.log(`✅ Consumer already initialized with ${this.kafkaConsumer.getStats().handlerCount} handlers`);
      return;
    }

    if (this.consumerInitializing) {
      console.log(`⏳ Consumer initialization already in progress, skipping duplicate call`);
      return;
    }

    // Mark as initializing to prevent duplicate calls
    this.consumerInitializing = true;
    
    try {
      console.log(`🔄 Starting consumer initialization with ${this.handlers.length} collected handlers`);
      
      // Register any handlers that were collected before init
      for (const handler of this.handlers) {
        console.log(`📝 Registering collected handler: ${handler.topicName}`);
        await this.kafkaConsumer.registerHandler(handler);
      }
      
      // Now initialize the consumer with all handlers registered
      await this.kafkaConsumer.onModuleInit();
      
      this.consumerInitialized = true;
      console.log(`✅ Consumer initialized with ${this.kafkaConsumer.getStats().handlerCount} handlers`);
    } catch (error) {
      console.error(`❌ Consumer initialization failed: ${error}`);
      this.consumerInitializing = false; // Reset flag on error
      throw error;
    } finally {
      this.consumerInitializing = false;
    }
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

}