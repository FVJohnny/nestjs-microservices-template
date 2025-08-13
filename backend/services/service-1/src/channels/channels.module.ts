import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { DDDModule, DDD_TOKENS } from '@libs/nestjs-ddd';
import { KafkaPublisherService } from '@libs/nestjs-kafka';

// Controllers
import { ChannelsController } from './interfaces/http/controllers/channels.controller';
import { TestKafkaController } from './interfaces/http/controllers/test-kafka.controller';

// Kafka Handlers (Primary/Driving Adapters)
import { TradingSignalsHandler } from './interfaces/messaging/kafka/handlers/trading-signals.handler';
import { UserEventsHandler } from './interfaces/messaging/kafka/handlers/user-events.handler';

// Kafka Service
import { KafkaService } from '../shared/messaging/kafka/kafka.service';

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
    KafkaService, // Add the Kafka service
    {
      provide: 'ChannelRepository',
      useClass: MongoDBChannelRepository, // Switch to MongoDB implementation
      // useClass: InMemoryChannelRepository, // Fallback to in-memory
    },
    // Single KafkaPublisherService instance
    {
      provide: KafkaPublisherService,
      useFactory: () => {
        const publisherConfig = {
          clientId: 'service-1-publisher',
          groupId: 'service-1-publisher-group',
          topics: [], // No topics to consume - this is only for publishing
        };
        return new KafkaPublisherService(publisherConfig);
      },
    },
    {
      provide: 'MessagePublisher',
      useFactory: (kafkaPublisher: KafkaPublisherService) => {
        return new KafkaMessagePublisher(kafkaPublisher);
      },
      inject: [KafkaPublisherService],
    },
  ],
  exports: [],
})
export class ChannelsModule {}
