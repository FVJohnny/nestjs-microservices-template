import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterUserCommand } from './register-user.command';
import { RegisterUserResponse } from './register-user.response';
import type { UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Name } from '../../../domain/value-objects/name.vo';
import { UserRole } from '../../../domain/value-objects/user-role.vo';
import { BadRequestException } from '@nestjs/common';
@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler
  implements ICommandHandler<RegisterUserCommand, RegisterUserResponse>
{
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResponse> {
    const email = new Email(command.email);
    const username = new Username(command.username);

    const emailExists = await this.userRepository.existsByEmail(email);
    if (emailExists) {
      throw new BadRequestException(`Email ${command.email} is already registered`);
    }

    const usernameExists = await this.userRepository.existsByUsername(username);
    if (usernameExists) {
      throw new BadRequestException(`Username ${command.username} is already taken`);
    }

    const user = User.create({
      email: new Email(command.email),
      username: new Username(command.username),
      firstName: new Name(command.firstName || ''),
      lastName: new Name(command.lastName || ''),
      roles: (command.roles || []).map(role => new UserRole(role)),
    });

    await this.userRepository.save(user);

    // Send Domain Events 
    const events = user.getUncommittedEvents();
    this.eventBus.publishAll(events);
    user.commit();

    return { id: user.id };
  }
}