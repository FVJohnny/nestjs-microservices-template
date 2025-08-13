import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { KafkaModuleOptions, KafkaMessageHandler } from './interfaces/kafka-config.interface';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private messageHandler?: KafkaMessageHandler;
  private processedMessages: number = 0;

  constructor(
    @Inject('KAFKA_OPTIONS') private readonly options: KafkaModuleOptions,
    @Inject('KAFKA_MESSAGE_HANDLER') messageHandler?: KafkaMessageHandler,
  ) {
    this.messageHandler = messageHandler;
    
    const kafkaConfig: any = {
      clientId: this.options.clientId,
      brokers: this.options.brokers || [process.env.KAFKA_BROKERS || 'localhost:9092'],
    };

    // Only add SSL and SASL if credentials are provided (for cloud Kafka)
    if (process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD) {
      kafkaConfig.ssl = {};
      kafkaConfig.sasl = {
        mechanism: "scram-sha-256",
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
      };
    }

    // Override with explicit config if provided
    if (this.options.ssl) {
      kafkaConfig.ssl = {};
    }
    if (this.options.sasl) {
      kafkaConfig.sasl = this.options.sasl;
    }

    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ 
      groupId: this.options.groupId,
      sessionTimeout: 6000,
      rebalanceTimeout: 6000,
      heartbeatInterval: 1000,
      maxWaitTimeInMs: 100,
      retry: {
        initialRetryTime: 100,
        retries: 5
      }
    });
  }

  async onModuleInit() {
    console.log(`[${this.options.clientId}] Starting Kafka producer connection...`);
    await this.producer.connect();
    console.log(`[${this.options.clientId}] Producer connected`);
    
    // Initialize consumer connection asynchronously to not block app startup
    this.initializeConsumer().catch(error => {
      console.error(`[${this.options.clientId}] Failed to initialize consumer:`, error);
    });
  }

  private async initializeConsumer() {
    console.log(`[${this.options.clientId}] Starting Kafka consumer connection...`);
    await this.consumer.connect();
    console.log(`[${this.options.clientId}] Consumer connected`);
    
    // Subscribe to configured topics
    for (const topic of this.options.topics) {
      console.log(`[${this.options.clientId}] Subscribing to topic: ${topic}`);
      await this.consumer.subscribe({ topic });
    }

    // Start consuming messages if handler is provided
    if (this.messageHandler) {
      console.log(`[${this.options.clientId}] Starting message consumption...`);
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const payload = {
            topic,
            partition,
            message: {
              offset: message.offset,
              value: message.value?.toString() || null,
              timestamp: message.timestamp || Date.now().toString(),
            },
          };

          try {
            await this.messageHandler!(payload);
            this.processedMessages++;
          } catch (error) {
            console.error(`[${this.options.clientId}] Error processing message from ${topic}:`, error);
          }
        },
      });
    }

    console.log(`[${this.options.clientId}] Kafka connected and consuming messages from topics: ${this.options.topics.join(', ')}`);
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    console.log(`[${this.options.clientId}] Kafka disconnected`);
  }

  async publishMessage(topic: string, message: any) {
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
        },
      ],
    });
    console.log(`[${this.options.clientId}] Published message to ${topic}:`, message);
  }

  async publishMessages(topic: string, messages: any[]) {
    await this.producer.send({
      topic,
      messages: messages.map(message => ({
        value: JSON.stringify(message),
        timestamp: Date.now().toString(),
      })),
    });
    console.log(`[${this.options.clientId}] Published ${messages.length} messages to ${topic}`);
  }

  getStats() {
    return {
      service: this.options.clientId,
      eventsProcessed: this.processedMessages,
      timestamp: new Date().toISOString(),
    };
  }
}
