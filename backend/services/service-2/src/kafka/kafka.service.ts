import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    const kafkaConfig: any = {
      clientId: 'service-2',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
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

    this.kafka = new Kafka(kafkaConfig);

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'service-2-group' });
  }

  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
    
    // Subscribe to topics
    await this.consumer.subscribe({ topic: 'example-topic' });

    // Start consuming messages
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`[Service-2] Received message from ${topic}:`, {
          partition,
          offset: message.offset,
          value: message.value?.toString(),
        });
      },
    });

    console.log('[Service-2] Kafka connected and consuming messages');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
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
    console.log(`[Service-2] Published message to ${topic}:`, message);
  }
}
