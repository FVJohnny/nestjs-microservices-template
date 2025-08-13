import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KafkaConsumerService, KafkaConsumerServiceConfig, KafkaPublisherService } from '@libs/nestjs-kafka';
import { TradingSignalsHandler } from '../../../channels/interfaces/messaging/kafka/handlers/trading-signals.handler';
import { UserEventsHandler } from '../../../channels/interfaces/messaging/kafka/handlers/user-events.handler';

/**
 * Consolidated Kafka service for Service-1.
 * Provides both consumer (for incoming messages) and publisher (for outgoing events) functionality.
 * This replaces the separate kafka.module.ts approach with a single consolidated service.
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafkaConsumer: KafkaConsumerService;
  
  constructor(
    private readonly tradingSignalsHandler: TradingSignalsHandler,
    private readonly userEventsHandler: UserEventsHandler,
    private readonly kafkaPublisher: KafkaPublisherService,
  ) {
    // Consumer configuration
    const consumerConfig: KafkaConsumerServiceConfig = {
      clientId: 'service-1-consumer',
      groupId: 'service-1-consumer-group',
      retryDelayMs: 5000,
    };
    
    this.kafkaConsumer = new KafkaConsumerService(consumerConfig);
  }

  async onModuleInit() {
    // Initialize consumer only (publisher is managed by DI)
    await this.kafkaConsumer.onModuleInit();
    
    // Register consumer handlers
    this.kafkaConsumer.registerHandler(this.tradingSignalsHandler);
    this.kafkaConsumer.registerHandler(this.userEventsHandler);
    
    // Subscribe to registered topics
    await this.kafkaConsumer.subscribeToRegisteredTopics();
    
    console.log(`✅ Service-1 Kafka setup complete: ${this.kafkaConsumer.getStats().handlerCount} handlers`);
  }

  async onModuleDestroy() {
    // Clean up consumer only (publisher is managed by DI)
    await this.kafkaConsumer.onModuleDestroy();
  }

  // Expose consumer stats for the test controller
  getConsumerStats() {
    return this.kafkaConsumer.getStats();
  }

  // Expose publisher for dependency injection
  getPublisher(): KafkaPublisherService {
    return this.kafkaPublisher;
  }
}