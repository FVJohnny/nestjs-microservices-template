import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { createTestAccessToken, createTestUsers, deleteUsers } from './utils';

describe('GET /users/:id (E2E)', () => {
  let testSetup: E2ETestSetup;
  let accessToken: string;

  beforeAll(async () => {
    testSetup = await createE2ETestApp({ bypassRateLimit: true });
    accessToken = createTestAccessToken(testSetup.jwtTokenService);
  });

  afterAll(async () => {
    await testSetup.app.close();
  });

  it('returns a user when found', async () => {
    // Create user via endpoint
    const userData = await createTestUsers(testSetup.server, accessToken, 1);

    const res = await request(testSetup.server)
      .get(`/api/v1/users/${userData[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.id).toBe(userData[0].id);
    expect(res.body.username).toBe(userData[0].username);
    expect(res.body.email).toBe(userData[0].email);
  });

  it('returns 404 Not Found when not found', async () => {
    await request(testSetup.server)
      .get(`/api/v1/users/${uuid()}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('returns 422 Unprocessable Entity when invalid id', async () => {
    await request(testSetup.server)
      .get(`/api/v1/users/invalid-id`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(422);
  });
});
