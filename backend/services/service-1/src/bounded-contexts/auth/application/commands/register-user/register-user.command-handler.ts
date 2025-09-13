import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterUserCommand, RegisterUserCommandResponse } from './register-user.command';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user/user.repository';
import { User } from '../../../domain/entities/user/user.entity';
import { Email, Username, Password, UserRole, UserRoleEnum } from '../../../domain/value-objects';
import { AlreadyExistsException, BaseCommandHandler } from '@libs/nestjs-common';

@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler extends BaseCommandHandler<
  RegisterUserCommand,
  RegisterUserCommandResponse
> {
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
      password: await Password.createFromPlainText(command.password),
      role: new UserRole(command.role as UserRoleEnum),
    });

    await this.userRepository.save(user);

    await this.sendDomainEvents<User>(user);

    return { id: user.id.toValue() };
  }

  protected authorize(_command: RegisterUserCommand): Promise<boolean> {
    // TODO: Implement authorization logic
    return Promise.resolve(true);
  }

  protected async validate(command: RegisterUserCommand): Promise<void> {
    const email = new Email(command.email);
    const username = new Username(command.username);

    const emailExists = await this.userRepository.existsByEmail(email);
    if (emailExists) {
      throw new AlreadyExistsException('email', command.email);
    }

    const usernameExists = await this.userRepository.existsByUsername(username);
    if (usernameExists) {
      throw new AlreadyExistsException('username', command.username);
    }
  }
}
