import { KafkaConfig } from 'kafkajs';

/**
 * Helper function to create Kafka configuration with proper authentication
 * Used by both KafkaService (producer) and BaseKafkaConsumerService (consumer)
 */
export function createKafkaConfig(clientId: string, brokers?: string[]): KafkaConfig {
  const kafkaConfig: KafkaConfig = {
    clientId,
    brokers: brokers || (process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092']),
  };

  // Only add SSL and SASL if credentials are provided (for cloud Kafka)
  if (process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD) {
    kafkaConfig.ssl = true;
    kafkaConfig.sasl = {
      mechanism: 'scram-sha-256',
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD,
    };
    kafkaConfig.connectionTimeout = 30000;
    kafkaConfig.authenticationTimeout = 30000;
    kafkaConfig.requestTimeout = 30000;
    kafkaConfig.retry = {
      initialRetryTime: 100,
      retries: 8,
    };
  }

  return kafkaConfig;
}