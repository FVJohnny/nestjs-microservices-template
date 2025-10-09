import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Logout_Command } from './logout.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { Base_CommandHandler, EVENT_BUS, Id, NotFoundException } from '@libs/nestjs-common';

export class Logout_CommandHandler extends Base_CommandHandler(Logout_Command) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
  ) {
    super(eventBus);
  }

  async handle(command: Logout_Command) {
    // Load the user
    const user = await this.userRepository.findById(new Id(command.userId));
    if (!user) {
      throw new NotFoundException('User', command.userId);
    }

    // Call logout on the user entity - this will raise UserLogout_DomainEvent
    user.logout();

    // Send domain events (the event handler will revoke all tokens)
    await this.sendDomainEvents(user);
  }

  async authorize(_command: Logout_Command) {
    return true;
  }

  async validate(_command: Logout_Command) {}
}
