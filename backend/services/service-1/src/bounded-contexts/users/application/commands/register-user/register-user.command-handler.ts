import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterUserCommand, RegisterUserCommandResponse } from './register-user.command';
import type { UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Name } from '../../../domain/value-objects/name.vo';
import { UserRole, UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import { BadRequestException } from '@nestjs/common';
@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler
  implements ICommandHandler<RegisterUserCommand, RegisterUserCommandResponse>
{
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserCommandResponse> {
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
      roles: (command.roles || []).map(role => new UserRole(role as UserRoleEnum)),
    });

    await this.userRepository.save(user);

    const events = user.getUncommittedEvents();
    this.eventBus.publishAll(events);
    user.commit();

    return { id: user.id };
  }
}