import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RefreshTokenCommand, RefreshTokenCommandResponse } from './refresh-token.command';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@bc/auth/domain/repositories/user/user.repository';
import {
  BaseCommandHandler,
  UnauthorizedException,
  JwtTokenService,
  Id,
} from '@libs/nestjs-common';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenCommandHandler extends BaseCommandHandler<
  RefreshTokenCommand,
  RefreshTokenCommandResponse
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtTokenService: JwtTokenService,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  protected async handle(command: RefreshTokenCommand): Promise<RefreshTokenCommandResponse> {
    let userId: string;

    try {
      const decoded = this.jwtTokenService.verifyRefreshToken(command.refreshToken);
      userId = decoded.userId;
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.userRepository.findById(new Id(userId));

    if (!user) {
      throw new UnauthorizedException();
    }

    // Check if user is active
    if (!user.isActive()) {
      throw new UnauthorizedException();
    }

    // Generate new JWT tokens
    const payload = {
      userId: user.id.toValue(),
      email: user.email.toValue(),
      username: user.username.toValue(),
      role: user.role.toValue(),
    };

    const accessToken = this.jwtTokenService.generateAccessToken(payload);
    const refreshToken = this.jwtTokenService.generateRefreshToken(payload);

    return {
      userId: user.id.toValue(),
      email: user.email.toValue(),
      username: user.username.toValue(),
      role: user.role.toValue(),
      accessToken,
      refreshToken,
    };
  }

  protected authorize(_command: RefreshTokenCommand): Promise<boolean> {
    // Refresh token doesn't require additional authorization - token validation is done in handle()
    return Promise.resolve(true);
  }

  protected async validate(command: RefreshTokenCommand): Promise<void> {
    if (!command.refreshToken || command.refreshToken.trim().length === 0) {
      throw new UnauthorizedException();
    }
  }
}
