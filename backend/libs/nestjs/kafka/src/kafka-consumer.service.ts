import { Injectable, Logger,OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer,Kafka, KafkaMessage } from 'kafkajs';

import { KafkaConsumerStats, KafkaTopicStats } from './interfaces/kafka-consumer.interface';
import { KafkaGenericHandler } from './kafka.types';
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
  private handlerMap: Map<string, KafkaGenericHandler> = new Map();
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
    setTimeout(() => {
      void this.initializeConsumer();
    }, 2000);
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
    this.logger.log(`👋 Kafka Consumer [${this.config.clientId}] disconnected`);
  }

  async initializeConsumer(): Promise<void> {
    try {
      this.logger.log('🔌 Connecting Consumer to Kafka...');
      await this.consumer.connect();
      this.logger.log('✅ Connected Consumer to Kafka successfully');
      
      // Subscribe to all topics we have handlers for
      const topics = Array.from(this.handlerMap.keys());
      await Promise.all(topics.map(topic => this.subscribeToTopic(topic)));

      // Start message consumption
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(topic, partition, message);
        },
      });

      this.isInitialized = true;
      this.logger.log(`🎉 Kafka Consumer [${this.config.clientId}] successfully initialized and consuming from topics: ${topics.join(', ')}`);
    } catch (error) {
      this.logger.error(`❌ Failed to initialize Kafka Consumer: ${error}`);
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

  private async handleMessage(topic: string, partition: number, message: KafkaMessage): Promise<void> {
    const startTime = Date.now();
    const handler = this.handlerMap.get(topic);
    if (!handler) {
      this.logger.warn(`❌ No handler found for topic: ${topic}`);
      return;
    }
      
    try {
      await handler.handle({
        topic,
        partition,
        message,
      });
        
      this.updateStats(topic, startTime, true);
    } catch (error) {
      this.logger.error(`💥 Error processing message from topic ${topic}: ${error}`);
      this.updateStats(topic, startTime, false);
    }
  }

  registerHandler(handler: KafkaGenericHandler): void {
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
  }

  private updateStats(topic: string, startTime: number, success: boolean): void {
    const processingTime = Date.now() - startTime;
    const stats = this.topicStats.get(topic);
    if (!stats) {
      this.logger.warn(`❌ No stats found for topic: ${topic}`);
      return;
    }
    
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
}