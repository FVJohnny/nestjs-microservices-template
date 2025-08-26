import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain - removing Mongoose schema imports

// Application - Commands
import { RegisterUserCommandHandler } from './application/commands/register-user.command-handler';
import { UpdateUserProfileCommandHandler } from './application/commands/update-user-profile.command-handler';

// Application - Queries
import { GetUsersQueryHandler } from './application/queries/get-users.query-handler';
import { GetUserByIdQueryHandler } from './application/queries/get-user-by-id.query-handler';

// No use cases - controllers use CommandBus/QueryBus directly

// Application - Domain Event Handlers
import { UserRegisteredDomainEventHandler } from './application/domain-event-handlers/user-registered.domain-event-handler';
import { UserProfileUpdatedDomainEventHandler } from './application/domain-event-handlers/user-profile-updated.domain-event-handler';

// Infrastructure - Repositories
import { UserMongodbRepository } from './infrastructure/repositories/mongodb/user-mongodb.repository';
import { UserInMemoryRepository } from './infrastructure/repositories/in-memory/user-in-memory.repository';

// Interface - HTTP
import { UsersController } from './interface/http/controllers/users.controller';

// Interface - Integration Events
import { UserExampleIntegrationEventHandler } from './interface/integration-events/user-example.integration-event-handler';

const CommandHandlers = [
  RegisterUserCommandHandler,
  UpdateUserProfileCommandHandler,
];

const QueryHandlers = [
  GetUsersQueryHandler,
  GetUserByIdQueryHandler,
];

const EventHandlers = [
  UserRegisteredDomainEventHandler,
  UserProfileUpdatedDomainEventHandler,
];

const IntegrationEventHandlers = [
  UserExampleIntegrationEventHandler,
];

// No use cases

const Repositories = [
  {
    provide: 'UserRepository',
    useClass: UserMongodbRepository,
  },
];

@Module({
  imports: [
    CqrsModule,
  ],
  controllers: [UsersController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    ...IntegrationEventHandlers,
    ...Repositories,
  ],
  exports: [
    'UserRepository',
  ],
})
export class UsersModule {}