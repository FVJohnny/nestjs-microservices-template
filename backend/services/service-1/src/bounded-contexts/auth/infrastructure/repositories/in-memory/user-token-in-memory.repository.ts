import type { RepositoryContext, Id } from '@libs/nestjs-common';
import { InMemoryBaseRepository } from '@libs/nestjs-common';
import type { UserToken_Repository } from '@bc/auth/domain/repositories/user-token/user-token.repository';
import { UserToken } from '@bc/auth/domain/entities/user-token/user-token.entity';
import type { UserTokenDTO } from '@bc/auth/domain/entities/user-token/user-token.dto';
import type { Token } from '@bc/auth/domain/entities/user-token/token.vo';
import {
  Criteria,
  Filter,
  FilterField,
  FilterOperator,
  Filters,
  FilterValue,
  Operator,
} from '@libs/nestjs-common';

export class UserToken_InMemory_Repository
  extends InMemoryBaseRepository<UserToken, UserTokenDTO>
  implements UserToken_Repository
{
  constructor(shouldFail: boolean = false) {
    super(shouldFail);
  }

  protected toEntity(dto: UserTokenDTO): UserToken {
    return UserToken.fromValue(dto);
  }

  async findByToken(token: Token) {
    const criteria = new Criteria({
      filters: new Filters([
        new Filter(
          new FilterField('token'),
          FilterOperator.fromValue(Operator.EQUAL),
          new FilterValue(token.toValue()),
        ),
      ]),
    });

    const result = await this.findByCriteria(criteria);
    return result.data[0] || null;
  }

  async getUserTokens(userId: Id): Promise<UserToken[]> {
    const allTokens = await this.findAll();
    return allTokens.filter((token) => token.userId.equals(userId));
  }

  async revokeAllUserTokens(userId: Id, context?: RepositoryContext): Promise<void> {
    // Delete all tokens
    for (const token of await this.findAll()) {
      if (token.userId.equals(userId)) {
        await this.remove(token.id, context);
      }
    }
  }
}
