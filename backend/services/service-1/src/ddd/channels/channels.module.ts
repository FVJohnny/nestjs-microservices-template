import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { DDDModule } from '@libs/nestjs-ddd';

// Controllers
import { ChannelsController } from './interfaces/http/controllers/channels.controller';

// Kafka Handlers (Primary/Driving Adapters)
import { TradingSignalsHandler } from './interfaces/messaging/kafka/handlers/trading-signals.handler';

// Command Handlers
import { RegisterChannelHandler } from './application/commands/register-channel.handler';

// Query Handlers
import { GetChannelsHandler } from './application/queries/get-channels.handler';

// Event Handlers
import { ChannelRegisteredHandler } from './application/events/channel-registered.handler';
import { MessageReceivedHandler } from './application/events/message-received.handler';

// Infrastructure
// import { MongoDBChannelRepository } from './infrastructure/repositories/mongodb-channel.repository';
// import { ChannelMongoSchema } from './infrastructure/schemas/channel.schema';
import { RedisChannelRepository } from './infrastructure/repositories/redis/redis-channel.repository';

const CommandHandlers = [RegisterChannelHandler];
const QueryHandlers = [GetChannelsHandler];
const EventHandlers = [ChannelRegisteredHandler, MessageReceivedHandler];
const KafkaHandlers = [TradingSignalsHandler];

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
