import { Inject } from '@nestjs/common';
import { GetNewTokensFromRefreshToken_Query } from './get-new-tokens-from-refresh-token.query';
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
import { GetNewTokensFromRefreshTokenQueryResponse } from './get-new-tokens-from-refresh-token.response';
import { USER_TOKEN_REPOSITORY } from '@bc/auth/domain/repositories/user-token/user-token.repository';
import { type UserToken_Repository } from '@bc/auth/domain/repositories/user-token/user-token.repository';
import { Token } from '@bc/auth/domain/entities/user-token/token.vo';

export class GetNewTokensFromRefreshToken_QueryHandler extends BaseQueryHandler(
  GetNewTokensFromRefreshToken_Query,
)<GetNewTokensFromRefreshTokenQueryResponse>() {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(USER_TOKEN_REPOSITORY)
    private readonly userTokenRepository: UserToken_Repository,
    private readonly jwtTokenService: JwtTokenService,
  ) {
    super();
  }

  async handle(
    query: GetNewTokensFromRefreshToken_Query,
  ): Promise<GetNewTokensFromRefreshTokenQueryResponse> {
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
    if (!user || !user.isActive()) {
      throw new UnauthorizedException();
    }

    // Check the token exists in repository
    const userToken = await this.userTokenRepository.findByToken(new Token(query.refreshToken));
    if (!userToken) {
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
      userId,
      accessToken,
      refreshToken,
    };
  }

  async authorize(_query: GetNewTokensFromRefreshToken_Query) {
    return true;
  }

  async validate(_query: GetNewTokensFromRefreshToken_Query) {}
}
