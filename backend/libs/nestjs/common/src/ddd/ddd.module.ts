import { Module } from '@nestjs/common';

/**
 * Shared DDD module that provides Domain-Driven Design patterns and abstractions
 * for use across multiple NestJS services.
 * 
 * Event publishers are now provided by their respective library modules:
 * - KafkaEventPublisher from @libs/nestjs-kafka
 * - RedisEventPublisher from @libs/nestjs-redis
 */
@Module({})
export class DDDModule {
}
