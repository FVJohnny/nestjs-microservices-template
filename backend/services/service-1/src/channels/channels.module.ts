import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { KafkaModule } from '../kafka/kafka.module';

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
import { KafkaMessagePublisherImpl } from './infrastructure/messaging/kafka-message.publisher';

const CommandHandlers = [RegisterChannelHandler];
const QueryHandlers = [GetChannelsHandler];
const EventHandlers = [ChannelRegisteredHandler, MessageReceivedHandler];

@Module({
  imports: [
    CqrsModule,
    KafkaModule,
  ],
  controllers: [ChannelsController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    InMemoryChannelRepository,
    KafkaMessagePublisherImpl,
    {
      provide: 'ChannelRepository',
      useClass: InMemoryChannelRepository,
    },
    {
      provide: 'KafkaMessagePublisher',
      useClass: KafkaMessagePublisherImpl,
    },
  ],
  exports: [
    'ChannelRepository',
    'KafkaMessagePublisher',
  ],
})
export class ChannelsModule {}
