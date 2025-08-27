import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Domain - removing Mongoose schema imports

// Application - Commands
import { RegisterUserCommandHandler, UpdateUserProfileCommandHandler } from './application/commands';

// Application - Queries
import { GetUsersQueryHandler, GetUserByIdQueryHandler } from './application/queries';

// No use cases - controllers use CommandBus/QueryBus directly

// Application - Domain Event Handlers
import { UserRegisteredDomainEventHandler } from './application/domain-event-handlers/user-registered.domain-event-handler';
import { UserProfileUpdatedDomainEventHandler } from './application/domain-event-handlers/user-profile-updated.domain-event-handler';

// Infrastructure - Repositories
import { UserMongodbRepository } from './infrastructure/repositories/mongodb/user-mongodb.repository';
import { UserInMemoryRepository } from './infrastructure/repositories/in-memory/user-in-memory.repository';

// Interface - HTTP
import { RegisterUserController, GetUserController, GetUsersController, UpdateUserProfileController } from './interface/http/controllers/users';

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
    useClass: UserInMemoryRepository,
  },
];

@Module({
  imports: [
    CqrsModule,
  ],
  controllers: [RegisterUserController, GetUserController, GetUsersController, UpdateUserProfileController],
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