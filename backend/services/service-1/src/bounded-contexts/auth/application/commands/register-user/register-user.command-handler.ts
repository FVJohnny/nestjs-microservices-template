import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterUser_Command } from './register-user.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { User } from '@bc/auth/domain/entities/user/user.entity';
import { Email, Username, Password } from '@bc/auth/domain/value-objects';
import { AlreadyExistsException, BaseCommandHandler } from '@libs/nestjs-common';

@CommandHandler(RegisterUser_Command)
export class RegisterUser_CommandHandler extends BaseCommandHandler<RegisterUser_Command> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: RegisterUser_Command) {
    const user = User.create({
      email: new Email(command.email),
      username: new Username(command.username),
      password: await Password.createFromPlainText(command.password),
    });

    await this.userRepository.save(user);

    await this.sendDomainEvents<User>(user);
  }

  protected async authorize(_command: RegisterUser_Command) {
    return true;
  }

  protected async validate(command: RegisterUser_Command) {
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
