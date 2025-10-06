import type { UserToken_Repository } from './user-token.repository';
import { UserToken } from '@bc/auth/domain/entities/user-token/user-token.entity';
import { Token } from '@bc/auth/domain/entities/user-token/token.vo';
import { Id } from '@libs/nestjs-common';

/**
 * Basic validation test to prevent Jest "no tests found" error
 */
describe('UserTokenRepository Contract Test Suite', () => {
  it('exports testUserTokenRepositoryContract function', () => {
    expect(typeof testUserTokenRepositoryContract).toBe('function');
  });
});

export function testUserTokenRepositoryContract(
  description: string,
  createRepository: () => Promise<UserToken_Repository>,
  setupTeardown?: {
    beforeAll?: () => Promise<void>;
    afterAll?: () => Promise<void>;
    beforeEach?: () => Promise<void>;
    afterEach?: () => Promise<void>;
  },
) {
  const setup = async ({ numTokens = 0, userId }: { numTokens?: number; userId?: Id } = {}) => {
    const repository = await createRepository();
    const actualUserId = userId || Id.random();
    const tokens: UserToken[] = [];

    for (let i = 0; i < numTokens; i++) {
      const token = UserToken.create({
        userId: actualUserId,
        token: new Token(`token-${i}-${Math.random()}`),
        type: i % 2 === 0 ? 'access' : 'refresh',
      });
      await repository.save(token);
      tokens.push(token);
    }

    return { repository, tokens, userId: actualUserId };
  };

  describe(`UserTokenRepository Contract: ${description}`, () => {
    if (setupTeardown?.beforeAll) {
      beforeAll(setupTeardown.beforeAll, 30000);
    }

    if (setupTeardown?.afterAll) {
      afterAll(setupTeardown.afterAll, 30000);
    }

    if (setupTeardown?.beforeEach) {
      beforeEach(setupTeardown.beforeEach);
    }

    if (setupTeardown?.afterEach) {
      afterEach(setupTeardown.afterEach);
    }

    describe('Basic CRUD Operations', () => {
      it('should save and find token by id', async () => {
        const { repository, tokens } = await setup({ numTokens: 1 });

        const savedToken = await repository.findById(tokens[0].id);
        expect(savedToken?.id.toValue()).toBe(tokens[0].id.toValue());
      });

      it('should return null when token does not exist', async () => {
        const { repository } = await setup({ numTokens: 0 });

        expect(await repository.findById(Id.random())).toBeNull();
        expect(await repository.findByToken(new Token('non-existent'))).toBeNull();
      });

      it('should find token by value', async () => {
        const { repository, tokens } = await setup({ numTokens: 1 });

        const result = await repository.findByToken(tokens[0].token);

        expect(result?.token.toValue()).toBe(tokens[0].token.toValue());
      });

      it('should get all tokens for a user', async () => {
        const userId = Id.random();
        const { repository } = await setup({ numTokens: 3, userId });

        const userTokens = await repository.getUserTokens(userId);

        expect(userTokens).toHaveLength(3);
        expect(userTokens.every((t) => t.userId.toValue() === userId.toValue())).toBe(true);
      });

      it('should revoke all user tokens', async () => {
        const userId = Id.random();
        const { repository } = await setup({ numTokens: 3, userId });

        await repository.revokeAllUserTokens(userId);

        expect(await repository.getUserTokens(userId)).toHaveLength(0);
      });

      it('should only revoke tokens for specified user', async () => {
        const user1Id = Id.random();
        const user2Id = Id.random();
        const { repository } = await setup({ numTokens: 2, userId: user1Id });

        // Add user2's tokens to the same repository
        for (let i = 0; i < 2; i++) {
          const token = UserToken.create({
            userId: user2Id,
            token: new Token(`user2-token-${i}-${Math.random()}`),
            type: i % 2 === 0 ? 'access' : 'refresh',
          });
          await repository.save(token);
        }

        await repository.revokeAllUserTokens(user1Id);

        expect(await repository.getUserTokens(user1Id)).toHaveLength(0);
        expect(await repository.getUserTokens(user2Id)).toHaveLength(2);
      });

      it('should check if token exists', async () => {
        const { repository, tokens } = await setup({ numTokens: 1 });

        expect(await repository.exists(tokens[0].id)).toBe(true);
        expect(await repository.exists(Id.random())).toBe(false);
      });

      it('should remove a token', async () => {
        const { repository, tokens } = await setup({ numTokens: 1 });

        await repository.remove(tokens[0].id);

        expect(await repository.exists(tokens[0].id)).toBe(false);
      });
    });

    describe('Integration Scenarios', () => {
      it('should handle complete token lifecycle', async () => {
        const userId = Id.random();
        const { repository } = await setup({ numTokens: 0 });

        const accessToken = UserToken.create({
          userId,
          token: new Token('access-token-123'),
          type: 'access',
        });
        const refreshToken = UserToken.create({
          userId,
          token: new Token('refresh-token-456'),
          type: 'refresh',
        });

        await repository.save(accessToken);
        await repository.save(refreshToken);
        expect(await repository.getUserTokens(userId)).toHaveLength(2);

        const foundAccess = await repository.findByToken(new Token('access-token-123'));
        expect(foundAccess?.type.toValue()).toBe('access');

        await repository.remove(accessToken.id);
        expect(await repository.getUserTokens(userId)).toHaveLength(1);

        await repository.revokeAllUserTokens(userId);
        expect(await repository.getUserTokens(userId)).toHaveLength(0);
      });
    });
  });
}
