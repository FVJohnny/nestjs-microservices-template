import { Inject } from '@nestjs/common';
import { GetUserTokenByToken_Query } from './get-user-token-by-token.query';
import {
  USER_TOKEN_REPOSITORY,
  type UserToken_Repository,
} from '@bc/auth/domain/repositories/user-token/user-token.repository';
import { BaseQueryHandler, NotFoundException } from '@libs/nestjs-common';
import { GetUserTokenByToken_QueryResponse } from './get-user-token-by-token.response';
import { Token } from '@bc/auth/domain/entities/user-token/token.vo';

export class GetUserTokenByToken_QueryHandler extends BaseQueryHandler(
  GetUserTokenByToken_Query,
)<GetUserTokenByToken_QueryResponse>() {
  constructor(
    @Inject(USER_TOKEN_REPOSITORY)
    private readonly userTokenRepository: UserToken_Repository,
  ) {
    super();
  }

  async handle(query: GetUserTokenByToken_Query): Promise<GetUserTokenByToken_QueryResponse> {
    const userToken = await this.userTokenRepository.findByToken(new Token(query.token));

    if (!userToken) {
      throw new NotFoundException();
    }

    return userToken.toValue();
  }

  async authorize(_query: GetUserTokenByToken_Query) {
    return true;
  }

  async validate(_query: GetUserTokenByToken_Query) {}
}
