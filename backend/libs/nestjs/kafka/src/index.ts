export * from './kafka.module';
export * from './kafka-publisher.service';
export * from './kafka-consumer.service';
export * from './kafka.controller';
export * from './dto/publish-event.dto';
export * from './interfaces/kafka-config.interface';
export * from './interfaces/kafka-consumer.interface';
export * from './kafka-config.helper';

// Legacy exports for backward compatibility
export { KafkaPublisherService as KafkaService } from './kafka-publisher.service';
