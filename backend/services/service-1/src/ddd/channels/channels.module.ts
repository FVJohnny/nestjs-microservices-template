import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { DDDModule } from '@libs/nestjs-ddd';

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

// Infrastructure
// import { MongoDBChannelRepository } from './infrastructure/repositories/mongodb-channel.repository';
// import { ChannelMongoSchema } from './infrastructure/schemas/channel.schema';
import { RedisChannelRepository } from './infrastructure/repositories/redis/redis-channel.repository';

const CommandHandlers = [RegisterChannelCommandHandler];
const QueryHandlers = [GetChannelsHandler];
const DomainEventHandlers = [ChannelRegisteredDomainEventHandler, MessageReceivedDomainEventHandler];
const IntegrationEventHandlers = [TradingSignalsIntegrationEventHandler];

@Module({
  imports: [
    CqrsModule,
    DDDModule,
  ],
  controllers: [ChannelsController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...DomainEventHandlers,
    ...IntegrationEventHandlers,
    {
      provide: 'ChannelRepository',
      useClass: RedisChannelRepository, // Change to RedisChannelRepository when needed
    },
  ],
  exports: [],
})
export class ChannelsModule {}
