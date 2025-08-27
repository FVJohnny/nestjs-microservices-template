import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { UpdateUserProfileCommand } from './update-user-profile.command';
import type { UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user.entity';

@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileCommandHandler
  implements ICommandHandler<UpdateUserProfileCommand, void>
{
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: UpdateUserProfileCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    
    if (!user) {
      throw new NotFoundException(`User with ID ${command.userId} not found`);
    }

    user.updateProfile({
      firstName: command.firstName,
      lastName: command.lastName,
      metadata: command.metadata,
    });

    await this.userRepository.save(user);
  }
}