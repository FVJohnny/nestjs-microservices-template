import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeleteUser_Command } from './delete-user.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/aggregates/user/user.repository';
import { User } from '@bc/auth/domain/aggregates/user/user.aggregate';
import {
  Base_CommandHandler,
  EVENT_BUS,
  Id,
  NotFoundException,
  OUTBOX_REPOSITORY,
  type Outbox_Repository,
  UserDeleted_IntegrationEvent,
  Transaction,
} from '@libs/nestjs-common';

export class DeleteUser_CommandHandler extends Base_CommandHandler(DeleteUser_Command) {
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

  async handle(command: DeleteUser_Command) {
    const userId = new Id(command.userId);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user');
    }

    user.delete();

    const integrationEvent = new UserDeleted_IntegrationEvent({
      id: Id.random().toValue(),
      occurredOn: new Date(),
      userId: user.id.toValue(),
      email: user.email.toValue(),
      username: user.username.toValue(),
    });

    await Transaction.run(async (context) => {
      await this.userRepository.remove(userId, context);
      await this.sendIntegrationEvent(integrationEvent, context);
      await this.sendDomainEvents<User>(user);
    });
  }

  async authorize(_command: DeleteUser_Command) {
    return true;
  }

  async validate(_command: DeleteUser_Command) {}
}
