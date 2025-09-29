import { wait, type JwtTokenService, type TokenPayload } from '@libs/nestjs-common';
import TestAgent from 'supertest/lib/agent';
import { v4 as uuid } from 'uuid';

interface TestUser {
  id: string;
  email: string;
  username: string;
  status: string;
  password: string;
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
  agent: TestAgent,
  accessToken: string,
  userIds: string[],
): Promise<void> {
  for (const userId of userIds) {
    const res = await agent
      .delete(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    if (res.status !== 204) {
      throw new Error(`Failed to delete user ${userId}: ${res.status} ${JSON.stringify(res.body)}`);
    }
  }
}

export async function createTestUsers(
  agent: TestAgent,
  accessToken: string,
  testId: string,
  amount: number = 1,
): Promise<TestUser[]> {
  const users: TestUser[] = [];

  for (let i = 0; i < amount; i++) {
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

    users.push({
      ...resGet.body.data[0],
      password: data.password,
    } as TestUser);

    // Small delay between creating users to avoid overwhelming the connection pool
    await wait(50);
  }

  return users;
}

function randomEmail(testId?: string): string {
  return `test-user-${testId}-${uuid().substring(0, 5)}@example.com`;
}

function randomUsername(testId?: string): string {
  return `test-user-${testId}-${uuid().substring(0, 5)}`;
}
