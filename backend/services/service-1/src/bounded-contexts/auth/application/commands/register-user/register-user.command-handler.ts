import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterUser_Command } from './register-user.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/aggregates/user/user.repository';
import { User } from '@bc/auth/domain/aggregates/user/user.aggregate';
import { Email, Username, Password } from '@bc/auth/domain/value-objects';
import {
  AlreadyExistsException,
  Base_CommandHandler,
  EVENT_BUS,
  OUTBOX_REPOSITORY,
  type Outbox_Repository,
  UserCreated_IntegrationEvent,
  Transaction,
  Id,
} from '@libs/nestjs-common';

export class RegisterUser_CommandHandler extends Base_CommandHandler(RegisterUser_Command) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
    @Inject(OUTBOX_REPOSITORY)
    outboxRepository: Outbox_Repository,
  ) {
    super(eventBus, outboxRepository);
  }

  async handle(command: RegisterUser_Command) {
    const user = User.create({
      email: new Email(command.email),
      username: new Username(command.username),
      password: await Password.createFromPlainText(command.password),
    });

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
      await this.sendDomainEvents<User>(user);
      await this.sendIntegrationEvent(integrationEvent, context);
    });
  }

  async authorize(_command: RegisterUser_Command) {
    return true;
  }

  async validate(command: RegisterUser_Command) {
    const email = new Email(command.email);
    const username = new Username(command.username);

    const emailExists = await this.userRepository.existsByEmail(email);
    if (emailExists) {
      throw new AlreadyExistsException('email', command.email);
    }

    const usernameExists = await this.userRepository.existsByUsername(username);
    if (usernameExists) {
      throw new AlreadyExistsException('username', command.username);
    }
  }
}
