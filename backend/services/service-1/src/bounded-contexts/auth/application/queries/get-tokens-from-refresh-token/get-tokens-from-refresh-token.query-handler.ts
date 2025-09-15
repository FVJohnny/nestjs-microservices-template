import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetTokensFromRefreshTokenQuery } from './get-tokens-from-refresh-token.query';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { UnauthorizedException, JwtTokenService, Id, TokenPayload } from '@libs/nestjs-common';
import { GetTokensFromRefreshTokenQueryResponse } from './get-tokens-from-refresh-token.response';

@QueryHandler(GetTokensFromRefreshTokenQuery)
export class GetTokensFromRefreshTokenQueryHandler
  implements IQueryHandler<GetTokensFromRefreshTokenQuery, GetTokensFromRefreshTokenQueryResponse>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(
    query: GetTokensFromRefreshTokenQuery,
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
}
