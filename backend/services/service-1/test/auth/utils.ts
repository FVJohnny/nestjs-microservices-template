import request from 'supertest';
import type { Server } from 'http';
import type { JwtTokenService, TokenPayload } from '@libs/nestjs-common';
import { v4 as uuid } from 'uuid';

interface TestUser {
  id: string;
  email: string;
  username: string;
  status: string;
}

export function createTestAccessToken(
  jwtTokenService: JwtTokenService,
  overrides: Partial<TokenPayload> = {},
): string {
  const payload: TokenPayload = {
    userId: overrides.userId ?? uuid(),
    email: overrides.email ?? randomEmail(),
    username: overrides.username ?? randomUsername(),
    role: overrides.role ?? 'admin',
  };

  return jwtTokenService.generateAccessToken(payload);
}

export async function deleteUsers(
  server: Server,
  accessToken: string,
  userIds: string[],
): Promise<void> {
  for (const userId of userIds) {
    const res = await request(server)
      .delete(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    if (res.status !== 204) {
      throw new Error(`Failed to delete user ${userId}: ${res.status} ${JSON.stringify(res.body)}`);
    }
  }
}

export async function createTestUsers(
  server: Server,
  accessToken: string,
  testId: string,
  amount: number = 1,
): Promise<TestUser[]> {
  const agent = request.agent(server);
  const userPromises = Array.from({ length: amount }, async () => {
      const data = {
        email: randomEmail(testId),
        username: randomUsername(testId),
        password: 'Password123!',
      };

      const resCreate = await agent
        .post('/api/v1/users')
        .send(data)
        .set('Authorization', `Bearer ${accessToken}`);

      if (resCreate.status !== 201) {
        throw new Error(
          `Failed to create test user: ${resCreate.status} ${JSON.stringify(resCreate.body)}`,
        );
      }

      const resGet = await agent
        .get(`/api/v1/users`)
        .query({ username: data.username })
        .set('Authorization', `Bearer ${accessToken}`);

      if (resGet.status !== 200) {
        throw new Error(`Failed to get test user: ${resGet.status} ${JSON.stringify(resGet.body)}`);
      }

      return resGet.body.data[0] as TestUser;
    });

    try {
      const users: TestUser[] = [];
      for (const userPromise of userPromises) {
        users.push(await userPromise);
      }
      return users;
    } catch (error) {
      console.error(error);
      throw error;
    }
}

function randomEmail(testId?: string): string {
  return `test-user-${testId}-${uuid().substring(0, 5)}@example.com`;
}

function randomUsername(testId?: string): string {
  return `test-user-${testId}-${uuid().substring(0, 5)}`;
}
