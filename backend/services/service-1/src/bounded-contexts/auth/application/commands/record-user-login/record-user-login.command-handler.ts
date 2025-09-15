import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RecordUserLoginCommand } from './record-user-login.command';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { BaseCommandHandler, Id, NotFoundException } from '@libs/nestjs-common';

@CommandHandler(RecordUserLoginCommand)
export class RecordUserLoginCommandHandler extends BaseCommandHandler<
  RecordUserLoginCommand,
  void
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: RecordUserLoginCommand): Promise<void> {
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

  protected authorize(_command: RecordUserLoginCommand): Promise<boolean> {
    // Login doesn't require additional authorization - authentication is done in handle()
    return Promise.resolve(true);
  }

  protected async validate(_command: RecordUserLoginCommand): Promise<void> {}
}
