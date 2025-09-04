import { Global, Module } from '@nestjs/common';

import { KafkaService } from './kafka-service';

/**
 * Global Kafka module that provides Kafka services to all modules
 * Configuration is read from environment variables:
 * - KAFKA_SERVICE_ID (default: 'default-service') - used for both clientId and groupId
 * - KAFKA_RETRY_DELAY_MS (default: '5000')
 */
@Global()
@Module({
  controllers: [],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class SharedKafkaModule {}