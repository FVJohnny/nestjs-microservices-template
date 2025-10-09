import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeleteUser_Command } from './delete-user.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { Base_CommandHandler, EVENT_BUS, Id, NotFoundException } from '@libs/nestjs-common';

export class DeleteUser_CommandHandler extends Base_CommandHandler(DeleteUser_Command) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
  ) {
    super(eventBus);
  }

  async handle(command: DeleteUser_Command) {
    const userId = new Id(command.userId);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user');
    }

    user.delete();
    await this.userRepository.remove(userId);
    await this.sendDomainEvents<User>(user);
  }

  async authorize(_command: DeleteUser_Command) {
    return true;
  }

  async validate(_command: DeleteUser_Command) {}
}
