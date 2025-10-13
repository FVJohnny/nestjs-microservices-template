import { User } from '@bc/auth/domain/aggregates/user/user.aggregate';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/aggregates/user/user.repository';
import {
  USER_UNIQUENESS_CHECKER,
  type IUserUniquenessChecker,
} from '@bc/auth/domain/services/user-uniqueness-checker/user-uniqueness-checker.interface';
import { Email, Password, Username } from '@bc/auth/domain/value-objects';
import {
  Base_CommandHandler,
  EVENT_BUS,
  Id,
  OUTBOX_REPOSITORY,
  Transaction,
  UserCreated_IntegrationEvent,
  type Outbox_Repository,
} from '@libs/nestjs-common';
import { Inject } from '@nestjs/common';
import { type IEventBus } from '@nestjs/cqrs';
import { RegisterUser_Command } from './register-user.command';

export class RegisterUser_CommandHandler extends Base_CommandHandler(RegisterUser_Command) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(USER_UNIQUENESS_CHECKER)
    private readonly uniquenessChecker: IUserUniquenessChecker,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
    @Inject(OUTBOX_REPOSITORY)
    outboxRepository: Outbox_Repository,
  ) {
    super(eventBus, outboxRepository);
  }

  async handle(command: RegisterUser_Command) {
    const user = await User.create(
      {
        email: new Email(command.email),
        username: new Username(command.username),
        password: await Password.createFromPlainText(command.password),
      },
      this.uniquenessChecker,
    );

    const integrationEvent = new UserCreated_IntegrationEvent({
      id: Id.random().toValue(),
      occurredOn: new Date(),
      userId: user.id.toValue(),
      email: user.email.toValue(),
      username: user.username.toValue(),
      role: user.role.toValue(),
    });

    await Transaction.run(async (context) => {
      await this.userRepository.save(user, context);
      await this.sendIntegrationEvent(integrationEvent, context);
      await this.sendDomainEvents<User>(user);
    });
  }

  async authorize(_command: RegisterUser_Command) {
    return true;
  }

  async validate(_command: RegisterUser_Command) {}
}
