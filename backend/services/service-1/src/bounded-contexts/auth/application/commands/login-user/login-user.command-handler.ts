import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUserCommand, LoginUserCommandResponse } from './login-user.command';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user/user.repository';
import { User } from '../../../domain/entities/user/user.entity';
import { Email } from '../../../domain/value-objects';
import { BaseCommandHandler, UnauthorizedException } from '@libs/nestjs-common';

@CommandHandler(LoginUserCommand)
export class LoginUserCommandHandler extends BaseCommandHandler<
  LoginUserCommand,
  LoginUserCommandResponse
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: LoginUserCommand): Promise<LoginUserCommandResponse> {
    const email = new Email(command.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Verify password
    const isPasswordValid = await user.password.verify(command.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    // Check if user is active
    if (!user.isActive()) {
      throw new UnauthorizedException();
    }

    // Record login
    user.recordLogin();
    await this.userRepository.save(user);

    // Send domain events if any
    await this.sendDomainEvents<User>(user);

    // Generate JWT token
    const payload = {
      userId: user.id,
      email: user.email.toValue(),
      username: user.username.toValue(),
      role: user.role.toValue(),
    };

    return {
      userId: user.id,
      email: user.email.toValue(),
      username: user.username.toValue(),
      role: user.role.toValue(),
      accessToken: this.jwtService.sign(payload),
    };
  }

  protected authorize(_command: LoginUserCommand): Promise<boolean> {
    // Login doesn't require additional authorization - authentication is done in handle()
    return Promise.resolve(true);
  }

  protected async validate(command: LoginUserCommand): Promise<void> {
    // Validate email format
    new Email(command.email);

    // Basic password validation
    if (!command.password || command.password.trim().length === 0) {
      throw new UnauthorizedException();
    }
  }
}
