import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KafkaModuleOptions } from './interfaces/kafka-config.interface';
import { createKafkaConfig } from './kafka-config.helper';

@Injectable()
export class KafkaPublisherService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  constructor(
    @Inject('KAFKA_OPTIONS') private readonly options: KafkaModuleOptions,
  ) {
    
    // Use shared configuration helper
    const kafkaConfig = createKafkaConfig(this.options.clientId, this.options.brokers);

    // Override with explicit config if provided
    if (this.options.ssl !== undefined) {
      (kafkaConfig as any).ssl = this.options.ssl;
    }
    if (this.options.sasl) {
      (kafkaConfig as any).sasl = this.options.sasl;
    }

    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    console.log(`[${this.options.clientId}] Starting Kafka producer connection...`);
    await this.producer.connect();
    console.log(`[${this.options.clientId}] Producer connected`);
  }


  async onModuleDestroy() {
    await this.producer.disconnect();
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

}
