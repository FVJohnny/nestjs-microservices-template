import { QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetTokensFromUserCredentials_Query } from './get-tokens-from-user-credentials.query';
import { GetTokensFromUserCredentials_QueryResponse } from './get-tokens-from-user-credentials.response';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { Email } from '@bc/auth/domain/value-objects';
import {
  BaseQueryHandler,
  UnauthorizedException,
  JwtTokenService,
  TokenPayload,
} from '@libs/nestjs-common';

@QueryHandler(GetTokensFromUserCredentials_Query)
export class GetTokensFromUserCredentials_QueryHandler extends BaseQueryHandler<
  GetTokensFromUserCredentials_Query,
  GetTokensFromUserCredentials_QueryResponse
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    private readonly jwtTokenService: JwtTokenService,
  ) {
    super();
  }

  protected async handle(
    query: GetTokensFromUserCredentials_Query,
  ): Promise<GetTokensFromUserCredentials_QueryResponse> {
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

  protected async authorize(_query: GetTokensFromUserCredentials_Query) {
    // Login doesn't require additional authorization - authentication is done in handle()
    return true;
  }

  protected async validate(query: GetTokensFromUserCredentials_Query) {
    // Validate email format
    new Email(query.email);

    // Basic password validation
    if (!query.password || query.password.trim().length === 0) {
      throw new UnauthorizedException();
    }
  }
}
