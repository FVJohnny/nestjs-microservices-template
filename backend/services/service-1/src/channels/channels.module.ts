import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { KafkaModule } from '../kafka/kafka.module';
import { DDDModule } from '@libs/nestjs-ddd';

// Controllers
import { ChannelsController } from './interfaces/controllers/channels.controller';

// Command Handlers
import { RegisterChannelHandler } from './application/commands/register-channel.handler';

// Query Handlers
import { GetChannelsHandler } from './application/queries/get-channels.handler';

// Event Handlers
import { ChannelRegisteredHandler } from './application/events/channel-registered.handler';
import { MessageReceivedHandler } from './application/events/message-received.handler';

// Infrastructure
import { InMemoryChannelRepository } from './infrastructure/repositories/in-memory-channel.repository';

// Shared DDD Library
import { KafkaMessagePublisher } from '@libs/nestjs-ddd';
import { KafkaService } from '@libs/nestjs-kafka';

const CommandHandlers = [RegisterChannelHandler];
const QueryHandlers = [GetChannelsHandler];
const EventHandlers = [ChannelRegisteredHandler, MessageReceivedHandler];

@Module({
  imports: [
    CqrsModule,
    KafkaModule,
    DDDModule,
  ],
  controllers: [ChannelsController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    {
      provide: 'ChannelRepository',
      useClass: InMemoryChannelRepository,
    },
    {
      provide: 'KAFKA_SERVICE',
      useExisting: KafkaService,
    },
    {
      provide: 'MessagePublisher',
      useClass: KafkaMessagePublisher,
      // useClass: RedisMessagePublisher,
    },
  ],
  exports: [],
})
export class ChannelsModule {}
