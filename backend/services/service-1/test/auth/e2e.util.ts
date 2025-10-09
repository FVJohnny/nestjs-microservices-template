import { wait } from '@libs/nestjs-common';
import TestAgent from 'supertest/lib/agent';
import { v4 as uuid } from 'uuid';

interface TestUser {
  id: string;
  email: string;
  username: string;
  status: string;
  password: string;
}

/**
 * Registers a new user, verifies their email, and logs them in to get an access token
 */
export async function registerAndLogin(
  agent: TestAgent,
  testId: string = 'admin',
): Promise<string> {
  // Register user
  const userData = {
    email: randomEmail(testId),
    username: randomUsername(testId),
    password: 'Password123!',
  };

  const registerRes = await agent.post('/api/v1/users').send(userData);

  if (registerRes.status !== 201) {
    throw new Error(
      `Failed to register user: ${registerRes.status} ${JSON.stringify(registerRes.body)}`,
    );
  }

  // Get the email verification by email
  const verifyRes = await agent.get('/api/v1/email-verification').query({ email: userData.email });

  if (verifyRes.status !== 200) {
    throw new Error(
      `Failed to get email verification: ${verifyRes.status} ${JSON.stringify(verifyRes.body)}`,
    );
  }

  // Verify the email
  const verificationRes = await agent
    .post('/api/v1/email-verification/verify')
    .send({ emailVerificationId: verifyRes.body.id });

  if (verificationRes.status !== 200) {
    throw new Error(
      `Failed to verify email: ${verificationRes.status} ${JSON.stringify(verificationRes.body)}`,
    );
  }

  // Login to get the access token
  const loginRes = await agent
    .post('/api/v1/auth/login')
    .send({ email: userData.email, password: userData.password });

  if (loginRes.status !== 200) {
    throw new Error(`Failed to login: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }

  return loginRes.body.accessToken;
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

    // Fetch the created user to get the full user data including ID
    const resGet = await agent
      .get('/api/v1/users')
      .query({ email: data.email })
      .set('Authorization', `Bearer ${accessToken}`);

    if (resGet.status !== 200 || !resGet.body.data || resGet.body.data.length === 0) {
      throw new Error(
        `Failed to fetch created user: ${resGet.status} ${JSON.stringify(resGet.body)}`,
      );
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

function randomEmail(testId?: string): string {
  return `test-user-${testId}-${uuid().substring(0, 5)}@example.com`;
}

function randomUsername(testId?: string): string {
  return `test-user-${testId}-${uuid().substring(0, 5)}`;
}
