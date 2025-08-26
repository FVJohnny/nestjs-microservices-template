import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedMongoDBModule, MongoDBConfigService } from '@libs/nestjs-mongodb';
import { MongoClient } from 'mongodb';

// Controllers
import { 
  RegisterChannelController,
  GetChannelsController,
} from './interfaces/http/controllers/channels';

// Integration Event Handlers (Primary/Driving Adapters)
import { TradingSignalsIntegrationEventHandler } from './interfaces/integration-events/trading-signals.integration-event-handler';

// Command Handlers
import { RegisterChannelCommandHandler } from './application/commands/register-channel/register-channel.command-handler';

// Query Handlers
import { GetChannelsHandler } from './application/queries/get-channels/get-channels.query-handler';

// Domain Event Handlers
import { ChannelRegisteredDomainEventHandler } from './application/domain-event-handlers/channel-registered/channel-registered.domain-event-handler';
import { MessageReceivedDomainEventHandler } from './application/domain-event-handlers/message-received/message-received.domain-event-handler';

// Infrastructure Redis
import { RedisChannelRepository } from './infrastructure/repositories/redis/redis-channel.repository';

// Infrastructure PostgreSQL
import { PostgreSQLChannelRepository } from './infrastructure/repositories/postgresql/postgresql-channel.repository';
import { PostgreSQLChannelEntity } from './infrastructure/repositories/postgresql/channel.schema';

// Infrastructure MongoDB
import { MongoDBChannelRepository } from './infrastructure/repositories/mongodb/mongodb-channel.repository';


const CommandHandlers = [RegisterChannelCommandHandler];
const QueryHandlers = [
  GetChannelsHandler,
];
const DomainEventHandlers = [
  ChannelRegisteredDomainEventHandler,
  MessageReceivedDomainEventHandler,
];
const IntegrationEventHandlers = [TradingSignalsIntegrationEventHandler];


@Module({
  imports: [
    // PostgreSQL
    TypeOrmModule.forFeature([PostgreSQLChannelEntity]),
  ],
  controllers: [
    RegisterChannelController,
    GetChannelsController,
  ],
  providers: [
    // CQRS
    ...CommandHandlers,
    ...QueryHandlers,

    // Event Handlers
    ...DomainEventHandlers,
    ...IntegrationEventHandlers,


    // Repositories
    {
      provide: 'ChannelRepository',
      // useClass: PostgreSQLChannelRepository,
      useClass: MongoDBChannelRepository,
      // useClass: RedisChannelRepository,
      // useClass: InMemoryChannelRepository,
    },
  ],
  exports: [],
})
export class ChannelsModule {}
