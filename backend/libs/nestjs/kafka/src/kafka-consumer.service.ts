import { Injectable, Logger,OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer,Kafka } from 'kafkajs';

import { KafkaConsumerStats, KafkaTopicHandler, KafkaTopicStats } from './interfaces/kafka-consumer.interface';
import { createKafkaConfig } from './kafka-config.helper';

export interface KafkaConsumerServiceConfig {
  clientId: string;
  groupId: string;
  brokers?: string[];
  retryDelayMs?: number;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumer: Consumer;
  private handlerMap: Map<string, KafkaTopicHandler> = new Map();
  private topicStats: Map<string, KafkaTopicStats> = new Map();
  private startTime: Date = new Date();
  private isInitialized = false;
  
  constructor(
    private readonly config: KafkaConsumerServiceConfig,
  ) {
    // Use shared configuration helper
    const kafkaConfig = createKafkaConfig(this.config.clientId, this.config.brokers);
    const kafka = new Kafka(kafkaConfig);
    
    this.consumer = kafka.consumer({ 
      groupId: this.config.groupId,
    });
  }

  async onModuleInit() {
    // Initialize consumer asynchronously to not block app startup
    this.initializeConsumerAsync().catch(error => {
      this.logger.error(`Failed to initialize Kafka consumer asynchronously: ${error}`);
    });
  }

  /**
   * Register a handler for a specific topic
   * Can be called before or after initialization
   */
  async registerHandler(handler: KafkaTopicHandler): Promise<void> {
    this.handlerMap.set(handler.topicName, handler);
    
    // Initialize stats for this topic
    this.topicStats.set(handler.topicName, {
      topic: handler.topicName,
      handlerName: handler.constructor.name,
      messagesProcessed: 0,
      messagesSucceeded: 0,
      messagesFailed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
    });
    
    this.logger.log(`📝 Registered handler for topic: ${handler.topicName} (${handler.constructor.name})`);
    this.logger.debug(`🔍 Current handler map size: ${this.handlerMap.size}, isInitialized: ${this.isInitialized}`);

    // Don't try to subscribe dynamically - too complex
    // Just log that we'll handle it during initialization or manually trigger subscription
    if (this.isInitialized) {
      this.logger.warn(`⚠️ Handler registered after initialization: ${handler.topicName}. Consumer restart may be needed.`);
    } else {
      this.logger.log(`⏳ Consumer not yet initialized, will subscribe later to: ${handler.topicName}`);
    }
  }

  /**
   * Register multiple handlers at once
   */
  async registerHandlers(handlers: KafkaTopicHandler[]): Promise<void> {
    await Promise.all(handlers.map(handler => this.registerHandler(handler)));
  }

  /**
   * Trigger subscription to all registered topics
   * Call this after all handlers are registered but before starting consumer
   */
  async subscribeToRegisteredTopics(): Promise<void> {
    const topics = Array.from(this.handlerMap.keys());
    if (topics.length > 0) {
      this.logger.log(`📡 Will subscribe to ${topics.length} registered topics when consumer initializes: ${topics.join(', ')}`);
      // Don't actually subscribe here - let the initialization handle it
      // Just confirm topics are ready
    } else {
      this.logger.warn('⚠️ No topics to subscribe to');
    }
  }

  private async initializeConsumerAsync(): Promise<void> {
    this.logger.log(`🚀 Starting Kafka consumer initialization asynchronously... [${this.config.clientId}]`);
    
    try {
      this.logger.log('🔌 Connecting to Kafka...');
      await this.consumer.connect();
      this.logger.log('✅ Connected to Kafka successfully');
      
      // Subscribe to all topics we have handlers for
      const topics = Array.from(this.handlerMap.keys());
      
      this.logger.log(`🔍 Topics available at initialization: ${topics.length} - [${topics.join(', ')}]`);
      
      if (topics.length === 0) {
        this.logger.warn('⚠️  No Kafka topics to subscribe to yet. Handlers can be registered later.');
      } else {
        this.logger.log(`📡 Subscribing to ${topics.length} topics during initialization...`);
        await this.subscribeToTopics(topics);
        this.logger.log(`✅ Successfully subscribed to all topics during initialization`);
      }

      // Start message consumption
      this.logger.log('⚡ Starting message consumption...');
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(topic, partition, message);
        },
      });

      this.isInitialized = true;
      this.logger.log(`🎉 Kafka consumer [${this.config.clientId}] successfully initialized and consuming from topics: ${topics.join(', ')}`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Kafka consumer: ${error}`);
      
      // Retry initialization after a delay
      const retryDelay = this.config.retryDelayMs || 5000;
      this.logger.log(`🔄 Retrying Kafka consumer initialization in ${retryDelay}ms...`);
      setTimeout(() => {
        this.initializeConsumerAsync().catch(retryError => {
          this.logger.error(`🔄 Retry failed: ${retryError}`);
        });
      }, retryDelay);
    }
  }

  private async subscribeToTopics(topics: string[]): Promise<void> {
    this.logger.log(`📡 Subscribing to ${topics.length} topics: ${topics.join(', ')}`);
    
    for (const topic of topics) {
      await this.subscribeToTopic(topic);
    }
  }

  private async subscribeToTopic(topic: string): Promise<void> {
    this.logger.log(`🔔 Attempting to subscribe to topic: ${topic}`);
    try {
      await this.consumer.subscribe({ 
        topic,
        fromBeginning: false,
      });
      this.logger.log(`✅ Successfully subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`❌ Failed to subscribe to topic ${topic}: ${error}`);
      throw error;
    }
  }

  private async handleMessage(topic: string, partition: number, message: any): Promise<void> {
    const startTime = Date.now();
    const stats = this.topicStats.get(topic);
    
    try {
      const handler = this.handlerMap.get(topic);
      if (handler) {
        await handler.handle({
          topic,
          partition,
          message: {
            offset: message.offset,
            value: message.value?.toString() || null,
            timestamp: message.timestamp || Date.now().toString(),
            key: message.key?.toString() || null,
          },
        });
        
        // Update success stats
        if (stats) {
          this.updateStats(stats, startTime, true);
        }
      } else {
        this.logger.warn(`❌ No handler found for topic: ${topic}`);
      }
    } catch (error) {
      this.logger.error(`💥 Error processing message from topic ${topic}: ${error}`);
      
      // Update failure stats
      if (stats) {
        this.updateStats(stats, startTime, false);
      }
      
      // Don't re-throw to avoid stopping the consumer
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
    this.logger.log(`👋 Kafka consumer [${this.config.clientId}] disconnected`);
  }

  private updateStats(stats: KafkaTopicStats, startTime: number, success: boolean): void {
    const processingTime = Date.now() - startTime;
    
    stats.messagesProcessed++;
    stats.totalProcessingTime += processingTime;
    stats.averageProcessingTime = stats.totalProcessingTime / stats.messagesProcessed;
    stats.lastProcessedAt = new Date();
    
    if (success) {
      stats.messagesSucceeded++;
    } else {
      stats.messagesFailed++;
    }
  }

  // Get consumer stats
  getStats(): KafkaConsumerStats {
    const handlers = Array.from(this.topicStats.values());
    const totalMessages = handlers.reduce((sum, stats) => sum + stats.messagesProcessed, 0);
    const totalSuccesses = handlers.reduce((sum, stats) => sum + stats.messagesSucceeded, 0);
    const totalFailures = handlers.reduce((sum, stats) => sum + stats.messagesFailed, 0);
    
    return {
      consumerId: this.config.clientId,
      handlerCount: this.handlerMap.size,
      topics: Array.from(this.handlerMap.keys()),
      handlers,
      totalMessages,
      totalSuccesses,
      totalFailures,
      uptime: Date.now() - this.startTime.getTime(),
      startedAt: this.startTime,
    };
  }

  // Get handler for a specific topic (useful for testing)
  getHandler(topic: string): KafkaTopicHandler | undefined {
    return this.handlerMap.get(topic);
  }

  // Check if consumer is ready
  isReady(): boolean {
    return this.isInitialized;
  }

  // Wait for consumer to be fully initialized
  async waitForReady(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    while (!this.isInitialized && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!this.isInitialized) {
      throw new Error(`Kafka consumer failed to initialize within ${timeoutMs}ms`);
    }
  }

}