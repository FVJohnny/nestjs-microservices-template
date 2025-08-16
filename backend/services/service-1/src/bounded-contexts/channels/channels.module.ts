import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { ChannelsController } from './interfaces/http/controllers/channels.controller';

// Integration Event Handlers (Primary/Driving Adapters)
import { TradingSignalsIntegrationEventHandler } from './interfaces/integration-events/trading-signals.integration-event-handler';

// Command Handlers
import { RegisterChannelCommandHandler } from './application/commands/register-channel.command-handler';

// Query Handlers
import { GetChannelsHandler } from './application/queries/get-channels.query-handler';

// Domain Event Handlers
import { ChannelRegisteredDomainEventHandler } from './application/domain-event-handlers/channel-registered.domain-event-handler';
import { MessageReceivedDomainEventHandler } from './application/domain-event-handlers/message-received.domain-event-handler';

// Infrastructure Redis
// import { RedisChannelRepository } from './infrastructure/repositories/redis/redis-channel.repository';

// Infrastructure PostgreSQL
import { PostgreSQLChannelRepository } from './infrastructure/repositories/postgresql/postgresql-channel.repository';
import { PostgreSQLChannelEntity } from './infrastructure/repositories/postgresql/channel.schema';

// Infrastructure MongoDB
import { ChannelMongoSchema } from './infrastructure/repositories/mongodb/channel.schema';
import { MongoDBChannelRepository } from './infrastructure/repositories/mongodb/mongodb-channel.repository';

const CommandHandlers = [RegisterChannelCommandHandler];
const QueryHandlers = [GetChannelsHandler];
const DomainEventHandlers = [
  ChannelRegisteredDomainEventHandler,
  MessageReceivedDomainEventHandler,
];
const IntegrationEventHandlers = [TradingSignalsIntegrationEventHandler];

@Module({
  imports: [
    // PostgreSQL
    TypeOrmModule.forFeature([PostgreSQLChannelEntity]),
    // MongoDB
    MongooseModule.forFeature([{ name: 'Channel', schema: ChannelMongoSchema }]),
  ],
  controllers: [ChannelsController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...DomainEventHandlers,
    ...IntegrationEventHandlers,
    // Repository
    {
      provide: 'ChannelRepository',
      useClass: PostgreSQLChannelRepository, // Change to the repository you want to use
      // useClass: MongoDBChannelRepository,
    },
  ],
  exports: [],
})
export class ChannelsModule {}
