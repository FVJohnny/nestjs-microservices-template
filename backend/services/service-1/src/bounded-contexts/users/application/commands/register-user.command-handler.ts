import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterUserCommand } from './register-user.command';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { BadRequestException } from '@nestjs/common';

@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler
  implements ICommandHandler<RegisterUserCommand>
{
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RegisterUserCommand): Promise<User> {
    const email = Email.fromString(command.email);

    const emailExists = await this.userRepository.existsByEmail(email);
    if (emailExists) {
      throw new BadRequestException(`Email ${command.email} is already registered`);
    }

    const usernameExists = await this.userRepository.existsByUsername(command.username);
    if (usernameExists) {
      throw new BadRequestException(`Username ${command.username} is already taken`);
    }

    const user = User.create({
      email: command.email,
      username: command.username,
      firstName: command.firstName,
      lastName: command.lastName,
      roles: command.roles,
      metadata: command.metadata,
    });

    await this.userRepository.save(user);

    // Send Domain Events 
    const events = user.getUncommittedEvents();
    this.eventBus.publishAll(events);
    user.commit();

    return user;
  }
}