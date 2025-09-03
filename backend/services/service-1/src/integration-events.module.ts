import { Module } from '@nestjs/common';
import { ConfigurableEventsModule } from '@libs/nestjs-events';
import {
  SharedKafkaModule,
  KafkaService,
  KafkaIntegrationEventPublisher,
  KafkaIntegrationEventListener,
} from '@libs/nestjs-kafka';
import {
  SharedRedisModule,
  RedisService,
  RedisIntegrationEventPublisher,
  RedisIntegrationEventListener,
} from '@libs/nestjs-redis';

@Module({
  imports: [
    ConfigurableEventsModule.forRoot({
      tool: 'kafka',
      sharedModule: SharedKafkaModule,
      service: KafkaService,
      integrationEventPublisher: KafkaIntegrationEventPublisher,
      integrationEventListener: KafkaIntegrationEventListener,
    }),
    // ConfigurableEventsModule.forRoot({
    //   tool: 'redis',
    //   sharedModule: SharedRedisModule,
    //   service: RedisService,
    //   integrationEventPublisher: RedisIntegrationEventPublisher,
    //   integrationEventListener: RedisIntegrationEventListener,
    // }),
  ],
  exports: [ConfigurableEventsModule],
})
export class IntegrationEventsModule {}
