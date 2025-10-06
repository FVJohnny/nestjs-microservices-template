import type { Repository, RepositoryContext, Id } from '@libs/nestjs-common';
import type { UserToken } from '@bc/auth/domain/entities/user-token/user-token.entity';
import type { Token } from '@bc/auth/domain/entities/user-token/token.vo';

export const USER_TOKEN_REPOSITORY = Symbol('UserTokenRepository');

export interface UserToken_Repository extends Repository<UserToken, Id> {
  /**
   * Get all active tokens for a user
   */
  getUserTokens(userId: Id): Promise<UserToken[]>;

  /**
   * Find a token by its value
   */
  findByToken(token: Token): Promise<UserToken | null>;

  /**
   * Revoke all tokens for a specific user
   */
  revokeAllUserTokens(userId: Id, context?: RepositoryContext): Promise<void>;
}
