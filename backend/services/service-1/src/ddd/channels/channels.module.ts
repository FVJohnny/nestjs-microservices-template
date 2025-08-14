import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { DDDModule } from '@libs/nestjs-ddd';

// Controllers
import { ChannelsController } from './interfaces/http/controllers/channels.controller';

// Kafka Handlers (Primary/Driving Adapters)
import { TradingSignalsTopicHandler } from './interfaces/messaging/kafka/topics/trading-signals/trading-signals.topic-handler';
import { ChannelCreateEventHandler } from './interfaces/messaging/kafka/topics/trading-signals/events/channel-create.event-handler';

// Command Handlers
import { RegisterChannelCommandHandler } from './application/commands/register-channel.handler';

// Query Handlers
import { GetChannelsHandler } from './application/queries/get-channels.handler';

// Event Handlers
import { ChannelRegisteredEventHandler } from './application/events/channel-registered.handler';
import { MessageReceivedHandler } from './application/events/message-received.handler';

// Infrastructure
// import { MongoDBChannelRepository } from './infrastructure/repositories/mongodb-channel.repository';
// import { ChannelMongoSchema } from './infrastructure/schemas/channel.schema';
import { RedisChannelRepository } from './infrastructure/repositories/redis/redis-channel.repository';

const CommandHandlers = [RegisterChannelCommandHandler];
const QueryHandlers = [GetChannelsHandler];
const EventHandlers = [ChannelRegisteredEventHandler, MessageReceivedHandler];
const KafkaHandlers = [TradingSignalsTopicHandler, ChannelCreateEventHandler];

@Module({
  imports: [
    CqrsModule,
    DDDModule,
    // MongooseModule.forFeature([{ name: 'Channel', schema: ChannelMongoSchema }]),
  ],
  controllers: [ChannelsController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    ...KafkaHandlers,
    {
      provide: 'ChannelRepository',
      useClass: RedisChannelRepository, // Change to RedisChannelRepository when needed
    },
  ],
  exports: [],
})
export class ChannelsModule {}
