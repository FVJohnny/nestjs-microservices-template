import { Injectable } from '@nestjs/common';
import { BaseRedisRepository } from '../base-redis.repository';
import { RedisService } from '../redis.service';
import type { RepositoryContext } from '@libs/nestjs-common';
import { Id, type UserToken_Repository, UserToken, Token } from '@libs/nestjs-common';

@Injectable()
export class UserToken_Redis_Repository
  extends BaseRedisRepository<UserToken>
  implements UserToken_Repository
{
  private readonly keyPrefix = 'auth:token:';
  private readonly userTokensPrefix = 'auth:user-tokens:';

  constructor(redisService: RedisService) {
    super(redisService);
  }

  protected itemKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  private getUserTokensKey(userId: string): string {
    return `${this.userTokensPrefix}${userId}`;
  }

  protected toEntity(json: string): UserToken {
    return UserToken.fromValue(JSON.parse(json));
  }

  async findByToken(token: Token) {
    const client = this.getRedisClient();
    const pattern = `${this.keyPrefix}*`;
    const keys = await client.keys(pattern);

    for (const key of keys) {
      const json = await client.get(key);
      if (json) {
        const userToken = this.toEntity(json);
        if (userToken.token.toValue() === token.toValue()) {
          return userToken;
        }
      }
    }

    return null;
  }

  async save(token: UserToken, context?: RepositoryContext): Promise<void> {
    this.registerTransactionParticipant(context);
    const client = this.getClient(context);

    // Add token to user's token set
    const userTokensKey = this.getUserTokensKey(token.userId.toValue());
    await client.sadd(userTokensKey, token.id.toValue());

    await super.save(token, context);

    this.logger.debug(`Stored ${token.type.toValue()} token for user ${token.userId.toValue()}`);
  }

  async getUserTokens(userId: Id): Promise<UserToken[]> {
    const userTokensKey = this.getUserTokensKey(userId.toValue());

    try {
      const tokenIds = await this.getRedisClient().smembers(userTokensKey);
      const tokens: UserToken[] = [];

      for (const tokenId of tokenIds) {
        const token = await this.findById(new Id(tokenId));
        if (token) {
          tokens.push(token);
        }
      }

      return tokens;
    } catch (error) {
      this.logger.error(`Failed to get user tokens: ${error}`);
      return [];
    }
  }

  async revokeAllUserTokens(userId: Id, context?: RepositoryContext): Promise<void> {
    this.registerTransactionParticipant(context);
    const client = this.getClient(context);

    const userTokensKey = this.getUserTokensKey(userId.toValue());

    try {
      // Get all token IDs for this user
      const tokenIds = await this.getRedisClient().smembers(userTokensKey);

      if (tokenIds.length === 0) {
        this.logger.debug(`No tokens found for user ${userId}`);
        return;
      }

      // Delete all tokens
      for (const tokenId of tokenIds) {
        await client.del(this.itemKey(tokenId));
        await this.remove(new Id(tokenId), context);
      }
      await client.del(userTokensKey);

      this.logger.debug(`Revoked ${tokenIds.length} tokens for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke user tokens: ${error}`);
      throw error;
    }
  }
}
