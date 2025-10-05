import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterUser_Command } from './register-user.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { Email, Username, Password } from '@bc/auth/domain/value-objects';
import {
  AlreadyExistsException,
  BaseCommandHandler,
  EVENT_BUS,
  OUTBOX_REPOSITORY,
  type OutboxRepository,
  UserCreated_IntegrationEvent,
  type RepositoryContext,
  OutboxTopic,
  OutboxEvent,
  OutboxEventName,
  OutboxPayload,
  Transaction,
} from '@libs/nestjs-common';

export class RegisterUser_CommandHandler extends BaseCommandHandler(RegisterUser_Command) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
  ) {
    super(eventBus);
  }

  async handle(command: RegisterUser_Command) {
    const user = User.create({
      email: new Email(command.email),
      username: new Username(command.username),
      password: await Password.createFromPlainText(command.password),
    });

    await Transaction.run(async (context) => {
      await this.userRepository.save(user, context);
      await this.sendIntegrationEvent(user, context);
      await this.sendDomainEvents<User>(user);
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

  private async sendIntegrationEvent(user: User, context: RepositoryContext) {
    const integrationEvent = new UserCreated_IntegrationEvent({
      userId: user.id.toValue(),
      email: user.email.toValue(),
      username: user.username.toValue(),
      role: user.role.toValue(),
    });

    const event = OutboxEvent.create({
      eventName: new OutboxEventName(UserCreated_IntegrationEvent.name),
      topic: new OutboxTopic(UserCreated_IntegrationEvent.topic),
      payload: new OutboxPayload(integrationEvent.toJSONString()),
    });
    await this.outboxRepository.save(event, context);
  }
}
