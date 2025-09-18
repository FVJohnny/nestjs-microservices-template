import request from 'supertest';
import type { Server } from 'http';
import type { JwtTokenService, TokenPayload } from '@libs/nestjs-common';
import { randomUUID } from 'crypto';

export function createTestAccessToken(
  jwtTokenService: JwtTokenService,
  overrides: Partial<TokenPayload> = {},
): string {
  const payload: TokenPayload = {
    userId: overrides.userId ?? randomUUID(),
    email: overrides.email ?? 'test-user@example.com',
    username: overrides.username ?? 'test-user',
    role: overrides.role ?? 'admin',
  };

  return jwtTokenService.generateAccessToken(payload);
}

export async function deleteAllUsers(server: Server, accessToken: string): Promise<void> {
  const usersResponse = await request(server)
    .get('/users')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  const userIds = Array.isArray(usersResponse.body?.data)
    ? usersResponse.body.data.map((user: { id: string }) => user.id)
    : [];

  await Promise.all(
    userIds.map(async (userId) => {
      const res = await request(server)
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      if (![204, 404].includes(res.status)) {
        throw new Error(`Failed to delete user ${userId}: ${res.status}`);
      }
    }),
  );
}
