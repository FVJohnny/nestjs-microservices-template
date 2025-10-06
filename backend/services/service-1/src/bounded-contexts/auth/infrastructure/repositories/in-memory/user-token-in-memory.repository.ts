import type { RepositoryContext, Id } from '@libs/nestjs-common';
import { InMemoryBaseRepository } from '@libs/nestjs-common';
import type { UserToken_Repository } from '@bc/auth/domain/repositories/user-token/user-token.repository';
import { UserToken } from '@bc/auth/domain/entities/user-token/user-token.entity';
import type { UserTokenDTO } from '@bc/auth/domain/entities/user-token/user-token.dto';

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
