import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { KafkaTopicHandler, KafkaConsumerStats, KafkaTopicStats } from './interfaces/kafka-consumer.interface';

export interface KafkaConsumerConfig {
  clientId: string;
  groupId: string;
  brokers?: string[];
  retryDelayMs?: number;
}

@Injectable()
export abstract class BaseKafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  protected consumer: Consumer;
  protected handlerMap: Map<string, KafkaTopicHandler> = new Map();
  protected topicStats: Map<string, KafkaTopicStats> = new Map();
  protected startTime: Date = new Date();
  
  constructor(
    protected readonly config: KafkaConsumerConfig,
  ) {
    const kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers || [process.env.KAFKA_BROKERS || 'kafka:9092'],
    });
    
    this.consumer = kafka.consumer({ 
      groupId: this.config.groupId,
    });
  }

  async onModuleInit() {
    // Register handlers (implemented by child classes)
    await this.registerHandlers();
    
    // Initialize consumer asynchronously to not block app startup
    this.initializeConsumerAsync().catch(error => {
      this.logger.error(`Failed to initialize Kafka consumer asynchronously: ${error}`);
    });
  }

  protected abstract registerHandlers(): Promise<void>;

  protected addHandler(handler: KafkaTopicHandler): void {
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
  }

  private async initializeConsumerAsync(): Promise<void> {
    this.logger.log(`🚀 Starting Kafka consumer initialization asynchronously... [${this.config.clientId}]`);
    
    try {
      this.logger.log('🔌 Connecting to Kafka...');
      await this.consumer.connect();
      this.logger.log('✅ Connected to Kafka successfully');
      
      // Subscribe to all topics we have handlers for
      const topics = Array.from(this.handlerMap.keys());
      
      if (topics.length === 0) {
        this.logger.warn('⚠️  No Kafka topics to subscribe to. No handlers were registered.');
        return;
      }
      
      this.logger.log(`📡 Subscribing to ${topics.length} topics: ${topics.join(', ')}`);
      
      for (const topic of topics) {
        await this.consumer.subscribe({ 
          topic,
          fromBeginning: false,
        });
        this.logger.log(`✅ Subscribed to topic: ${topic}`);
      }

      this.logger.log('⚡ Starting message consumption...');
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
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
        },
      });

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
    return this.handlerMap.size > 0;
  }
}