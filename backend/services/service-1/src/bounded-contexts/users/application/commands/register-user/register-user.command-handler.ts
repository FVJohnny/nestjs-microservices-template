import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterUserCommand, RegisterUserCommandResponse } from './register-user.command';
import { USER_REPOSITORY, type UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Username } from '../../../domain/value-objects/username.vo';
import { Name } from '../../../domain/value-objects/name.vo';
import { UserRole, UserRoleEnum } from '../../../domain/value-objects/user-role.vo';
import { BadRequestException } from '@nestjs/common';
import { BaseCommandHandler } from '@libs/nestjs-common';

@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler extends BaseCommandHandler<RegisterUserCommand, RegisterUserCommandResponse> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: RegisterUserCommand): Promise<RegisterUserCommandResponse> {
    const user = User.create({
      email: new Email(command.email),
      username: new Username(command.username),
      firstName: new Name(command.firstName),
      lastName: new Name(command.lastName),
      role: new UserRole(command.role as UserRoleEnum),
    });

    await this.userRepository.save(user);

    await this.sendDomainEvents(user);

    return { id: user.id };
  }

  protected async authorize(command: RegisterUserCommand): Promise<boolean> {
    // TODO: Implement authorization logic
    return true;
  }

  protected async validate(command: RegisterUserCommand): Promise<void> {
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
  }
}