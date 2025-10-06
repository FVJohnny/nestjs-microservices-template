import type { Repository, RepositoryContext, Id } from '@libs/nestjs-common';
import type { UserToken } from '@bc/auth/domain/entities/user-token/user-token.entity';

export const USER_TOKEN_REPOSITORY = Symbol('UserTokenRepository');

export interface UserToken_Repository extends Repository<UserToken, Id> {
  /**
   * Get all active tokens for a user
   */
  getUserTokens(userId: Id): Promise<UserToken[]>;

  /**
   * Revoke all tokens for a specific user
   */
  revokeAllUserTokens(userId: Id, context?: RepositoryContext): Promise<void>;
}
