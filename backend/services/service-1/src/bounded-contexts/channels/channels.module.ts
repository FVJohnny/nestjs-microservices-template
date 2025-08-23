import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { ChannelsController } from './interfaces/http/controllers/channels.controller';

// Integration Event Handlers (Primary/Driving Adapters)
import { TradingSignalsIntegrationEventHandler } from './interfaces/integration-events/trading-signals.integration-event-handler';

// Command Handlers
import { RegisterChannelCommandHandler } from './application/commands/register-channel/register-channel.command-handler';

// Query Handlers
import { GetChannelsHandler } from './application/queries/get-channels/get-channels.query-handler';
import { CountUserChannelsHandler } from './application/queries/count-user-channels/count-user-channels.query-handler';
import { FindChannelByUserAndNameHandler } from './application/queries/find-channel-by-user-and-name/find-channel-by-user-and-name.query-handler';

// Domain Event Handlers
import { ChannelRegisteredDomainEventHandler } from './application/domain-event-handlers/channel-registered/channel-registered.domain-event-handler';
import { MessageReceivedDomainEventHandler } from './application/domain-event-handlers/message-received/message-received.domain-event-handler';

// Infrastructure Redis
// import { RedisChannelRepository } from './infrastructure/repositories/redis/redis-channel.repository';

// Infrastructure PostgreSQL
import { PostgreSQLChannelRepository } from './infrastructure/repositories/postgresql/postgresql-channel.repository';
import { PostgreSQLChannelEntity } from './infrastructure/repositories/postgresql/channel.schema';

// Infrastructure MongoDB
import { ChannelMongoSchema } from './infrastructure/repositories/mongodb/channel.schema';
import { MongoDBChannelRepository } from './infrastructure/repositories/mongodb/mongodb-channel.repository';

// Use Cases
import {
  RegisterChannelUseCase,
  RegisterChannelUseCaseImpl,
} from './application/use-cases/register-channel/register-channel.use-case';
import {
  GetChannelsUseCase,
  GetChannelsUseCaseImpl,
} from './application/use-cases/get-channels/get-channels.use-case';


const CommandHandlers = [RegisterChannelCommandHandler];
const QueryHandlers = [
  GetChannelsHandler,
  CountUserChannelsHandler,
  FindChannelByUserAndNameHandler,
];
const DomainEventHandlers = [
  ChannelRegisteredDomainEventHandler,
  MessageReceivedDomainEventHandler,
];
const IntegrationEventHandlers = [TradingSignalsIntegrationEventHandler];

// Use Cases
const UseCases = [
  {
    provide: RegisterChannelUseCase.token,
    useClass: RegisterChannelUseCaseImpl,
  },
  {
    provide: GetChannelsUseCase.token,
    useClass: GetChannelsUseCaseImpl,
  },
];

@Module({
  imports: [
    // PostgreSQL
    TypeOrmModule.forFeature([PostgreSQLChannelEntity]),
    // MongoDB
    MongooseModule.forFeature([
      { name: 'Channel', schema: ChannelMongoSchema },
    ]),
  ],
  controllers: [ChannelsController],
  providers: [
    // CQRS
    ...CommandHandlers,
    ...QueryHandlers,

    // Event Handlers
    ...DomainEventHandlers,
    ...IntegrationEventHandlers,

    // Use Cases
    ...UseCases,

    // Repositories
    {
      provide: 'ChannelRepository',
      useClass: PostgreSQLChannelRepository,
      // useClass: MongoDBChannelRepository,
      // useClass: RedisChannelRepository,
      // useClass: InMemoryChannelRepository,
    },
  ],
  exports: [],
})
export class ChannelsModule {}
