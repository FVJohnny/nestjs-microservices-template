import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { DDDModule } from '@libs/nestjs-ddd';

// Controllers
import { ChannelsController } from './interfaces/http/controllers/channels.controller';
import { TestKafkaController } from './interfaces/http/controllers/test-kafka.controller';

// Kafka Handlers (Primary/Driving Adapters)
import { TradingSignalsHandler } from './interfaces/messaging/kafka/handlers/trading-signals.handler';
import { UserEventsHandler } from './interfaces/messaging/kafka/handlers/user-events.handler';


// Command Handlers
import { RegisterChannelHandler } from './application/commands/register-channel.handler';
import { ProcessSignalHandler } from './application/commands/process-signal.handler';

// Query Handlers
import { GetChannelsHandler } from './application/queries/get-channels.handler';

// Event Handlers
import { ChannelRegisteredHandler } from './application/events/channel-registered.handler';
import { MessageReceivedHandler } from './application/events/message-received.handler';

// Infrastructure
import { InMemoryChannelRepository } from './infrastructure/repositories/in-memory-channel.repository';
import { MongoDBChannelRepository } from './infrastructure/repositories/mongodb-channel.repository';
import { ChannelSchema } from './infrastructure/schemas/channel.schema';


const CommandHandlers = [RegisterChannelHandler, ProcessSignalHandler];
const QueryHandlers = [GetChannelsHandler];
const EventHandlers = [ChannelRegisteredHandler, MessageReceivedHandler];
const KafkaHandlers = [TradingSignalsHandler, UserEventsHandler];

@Module({
  imports: [
    CqrsModule,
    DDDModule,
    MongooseModule.forFeature([
      { name: 'Channel', schema: ChannelSchema }
    ]),
  ],
  controllers: [ChannelsController, TestKafkaController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    ...KafkaHandlers,
    {
      provide: 'ChannelRepository',
      useClass: MongoDBChannelRepository, // Switch to MongoDB implementation
      // useClass: InMemoryChannelRepository, // Fallback to in-memory
    },
  ],
  exports: [],
})
export class ChannelsModule {}
