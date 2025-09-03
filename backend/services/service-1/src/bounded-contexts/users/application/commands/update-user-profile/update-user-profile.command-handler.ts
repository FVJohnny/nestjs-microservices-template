import { CommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateUserProfileCommand } from './update-user-profile.command';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import { Name } from '../../../domain/value-objects/name.vo';
import { EventBus } from '@nestjs/cqrs';
import { BaseCommandHandler, NotFoundException } from '@libs/nestjs-common';

@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileCommandHandler extends BaseCommandHandler<
  UpdateUserProfileCommand,
  void
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: UpdateUserProfileCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new NotFoundException();
    }

    user.updateProfile({
      firstName: new Name(command.firstName),
      lastName: new Name(command.lastName),
    });

    await this.userRepository.save(user);

    // Use the base class method to send domain events
    await this.sendDomainEvents(user);
  }

  protected async authorize(
    command: UpdateUserProfileCommand,
  ): Promise<boolean> {
    // TODO: Implement authorization logic
    return true;
  }

  protected async validate(command: UpdateUserProfileCommand): Promise<void> {}
}
