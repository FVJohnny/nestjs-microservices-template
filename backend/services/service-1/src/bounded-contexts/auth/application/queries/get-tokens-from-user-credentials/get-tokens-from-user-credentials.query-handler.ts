import { QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetTokensFromUserCredentialsQuery } from './get-tokens-from-user-credentials.query';
import { GetTokensFromUserCredentialsQueryResponse } from './get-tokens-from-user-credentials.response';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { Email } from '@bc/auth/domain/value-objects';
import {
  BaseQueryHandler,
  UnauthorizedException,
  JwtTokenService,
  TokenPayload,
} from '@libs/nestjs-common';

@QueryHandler(GetTokensFromUserCredentialsQuery)
export class GetTokensFromUserCredentialsQueryHandler extends BaseQueryHandler<
  GetTokensFromUserCredentialsQuery,
  GetTokensFromUserCredentialsQueryResponse
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {
    super();
  }

  protected async handle(
    query: GetTokensFromUserCredentialsQuery,
  ): Promise<GetTokensFromUserCredentialsQueryResponse> {
    const email = new Email(query.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Verify password
    const isPasswordValid = await user.password.verify(query.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    // Check if user is active
    if (!user.isActive()) {
      throw new UnauthorizedException();
    }

    // Generate JWT tokens
    const payload: TokenPayload = {
      userId: user.id.toValue(),
      email: user.email.toValue(),
      username: user.username.toValue(),
      role: user.role.toValue(),
    };

    const accessToken = this.jwtTokenService.generateAccessToken(payload);
    const refreshToken = this.jwtTokenService.generateRefreshToken(payload);

    return {
      userId: user.id.toValue(),
      accessToken,
      refreshToken,
    };
  }

  protected authorize(_query: GetTokensFromUserCredentialsQuery): Promise<boolean> {
    // Login doesn't require additional authorization - authentication is done in handle()
    return Promise.resolve(true);
  }

  protected async validate(query: GetTokensFromUserCredentialsQuery): Promise<void> {
    // Validate email format
    new Email(query.email);

    // Basic password validation
    if (!query.password || query.password.trim().length === 0) {
      throw new UnauthorizedException();
    }
  }
}
