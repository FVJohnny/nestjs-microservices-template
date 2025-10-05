import { Inject } from '@nestjs/common';
import { GetTokensFromRefreshToken_Query } from './get-tokens-from-refresh-token.query';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import {
  BaseQueryHandler,
  UnauthorizedException,
  JwtTokenService,
  Id,
  TokenPayload,
} from '@libs/nestjs-common';
import { GetTokensFromRefreshTokenQueryResponse } from './get-tokens-from-refresh-token.response';

export class GetTokensFromRefreshToken_QueryHandler extends BaseQueryHandler(
  GetTokensFromRefreshToken_Query,
)<GetTokensFromRefreshTokenQueryResponse>() {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    private readonly jwtTokenService: JwtTokenService,
  ) {
    super();
  }

  async handle(
    query: GetTokensFromRefreshToken_Query,
  ): Promise<GetTokensFromRefreshTokenQueryResponse> {
    if (!query.refreshToken || query.refreshToken.trim().length === 0) {
      throw new UnauthorizedException();
    }

    let userId: string;

    try {
      const decoded = this.jwtTokenService.verifyRefreshToken(query.refreshToken);
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
    const payload: TokenPayload = {
      userId: user.id.toValue(),
      email: user.email.toValue(),
      username: user.username.toValue(),
      role: user.role.toValue(),
    };

    const accessToken = this.jwtTokenService.generateAccessToken(payload);
    const refreshToken = this.jwtTokenService.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  }

  async authorize(_query: GetTokensFromRefreshToken_Query) {
    return true;
  }

  async validate(_query: GetTokensFromRefreshToken_Query) {}
}
