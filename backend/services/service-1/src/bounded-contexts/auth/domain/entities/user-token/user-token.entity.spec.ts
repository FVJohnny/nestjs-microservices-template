import { UserToken } from './user-token.entity';
import { Token } from './token.vo';
import { Id } from '@libs/nestjs-common';
import { UserTokenDTO } from './user-token.dto';

describe('UserToken Entity', () => {
  it('should create a user token with required properties', () => {
    const userId = Id.random();
    const token = new Token('test-token-value');

    const userToken = UserToken.create({ userId, token, type: 'access' });

    expect(userToken.userId).toBe(userId);
    expect(userToken.token).toBe(token);
    expect(userToken.type.toValue()).toBe('access');
  });

  it('should serialize and deserialize correctly', () => {
    const dto: UserTokenDTO = {
      id: Id.random().toValue(),
      userId: Id.random().toValue(),
      token: 'test-token-value',
      type: 'refresh',
      createdAt: new Date('2024-01-01T12:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
    };

    const userToken = UserToken.fromValue(dto);
    const result = userToken.toValue();

    expect(result.id).toBe(dto.id);
    expect(result.userId).toBe(dto.userId);
    expect(result.token).toBe(dto.token);
    expect(result.type).toBe(dto.type);
  });
});
