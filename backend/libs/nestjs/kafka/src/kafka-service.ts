import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka, Producer } from 'kafkajs';

import { createKafkaConfig } from './kafka-config.helper';


/**
 * Generic Kafka service that provides both consumer and publisher functionality.
 * Can be used by any NestJS service that needs Kafka integration.
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private consumer: Consumer;
  private producer: Producer;
  private readonly logger = new Logger(KafkaService.name);
  
  
  constructor() {

    // Use shared configuration helper
    const kafkaConfig = createKafkaConfig();
    const kafka = new Kafka(kafkaConfig);
    
    this.consumer = kafka.consumer({ 
      groupId: kafkaConfig.clientId || 'default-group',
    });
    this.producer = kafka.producer();
  }



  async onModuleInit() {
    await Promise.all([
      this.consumer.connect(),
      this.producer.connect()
    ]);
  }

  async onModuleDestroy() {
    await Promise.all([
      this.consumer.disconnect(),
      this.producer.disconnect()
    ]);
  }

  // // Expose consumer stats for monitoring
  // getConsumerStats() {
  //   return this.kafkaConsumer.getStats();
  // }

  getConsumer(): Consumer {
    return this.consumer;
  }

  getProducer(): Producer {
    return this.producer;
  }

}