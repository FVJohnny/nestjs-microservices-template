import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaModule } from '../kafka/kafka.module';
import { DDDModule } from '@libs/nestjs-ddd';

// Controllers
import { ChannelsController } from './interfaces/http/controllers/channels.controller';
import { TestKafkaController } from './interfaces/http/controllers/test-kafka.controller';

// Kafka Handlers (Primary/Driving Adapters)
import { TradingSignalsHandler } from './interfaces/messaging/kafka/handlers/trading-signals.handler';
import { UserEventsHandler } from './interfaces/messaging/kafka/handlers/user-events.handler';

// Kafka Consumer Service
import { Service1KafkaConsumerService } from '../shared/messaging/kafka/service-1-kafka-consumer.service';

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

// Shared DDD Library
import { KafkaMessagePublisher } from '@libs/nestjs-ddd';
import { KafkaService } from '@libs/nestjs-kafka';

const CommandHandlers = [RegisterChannelHandler, ProcessSignalHandler];
const QueryHandlers = [GetChannelsHandler];
const EventHandlers = [ChannelRegisteredHandler, MessageReceivedHandler];
const KafkaHandlers = [TradingSignalsHandler, UserEventsHandler];

@Module({
  imports: [
    CqrsModule,
    KafkaModule,
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
    Service1KafkaConsumerService, // Add the Kafka consumer service
    {
      provide: 'ChannelRepository',
      useClass: MongoDBChannelRepository, // Switch to MongoDB implementation
      // useClass: InMemoryChannelRepository, // Fallback to in-memory
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
