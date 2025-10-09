import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RecordUserLogin_Command } from './record-user-login.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/aggregates/user/user.repository';
import { User } from '@bc/auth/domain/aggregates/user/user.aggregate';
import { Base_CommandHandler, EVENT_BUS, Id, NotFoundException } from '@libs/nestjs-common';

export class RecordUserLogin_CommandHandler extends Base_CommandHandler(RecordUserLogin_Command) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
  ) {
    super(eventBus);
  }

  async handle(command: RecordUserLogin_Command) {
    const user = await this.userRepository.findById(new Id(command.userId));

    if (!user) {
      throw new NotFoundException();
    }

    // Record login
    user.recordLogin();
    await this.userRepository.save(user);

    // Send domain events if any
    await this.sendDomainEvents<User>(user);
  }

  async authorize(_command: RecordUserLogin_Command) {
    return true;
  }

  async validate(_command: RecordUserLogin_Command) {}
}
