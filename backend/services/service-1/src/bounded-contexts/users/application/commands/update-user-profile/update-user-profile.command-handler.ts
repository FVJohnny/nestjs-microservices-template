import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { UpdateUserProfileCommand } from './update-user-profile.command';
import type { UserRepository } from '../../../domain/repositories/user.repository';
import { Name } from '../../../domain/value-objects/name.vo';
import { EventBus } from '@nestjs/cqrs';

@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileCommandHandler
  implements ICommandHandler<UpdateUserProfileCommand, void>
{
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateUserProfileCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    
    if (!user) {
      throw new NotFoundException(`User with ID ${command.userId} not found`);
    }

    user.updateProfile({
      firstName: new Name(command.firstName || ''),
      lastName: new Name(command.lastName || ''),
    });

    await this.userRepository.save(user);

    const events = user.getUncommittedEvents();
    this.eventBus.publishAll(events);
    user.commit();
  }
}