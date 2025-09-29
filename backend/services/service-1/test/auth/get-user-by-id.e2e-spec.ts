import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { createTestAccessToken, deleteAllUsers } from './utils';

describe('GET /users/:id (E2E)', () => {
  let testSetup: E2ETestSetup;
  let accessToken: string;

  beforeAll(async () => {
    testSetup = await createE2ETestApp();
    accessToken = createTestAccessToken(testSetup.jwtTokenService);
  });

  afterAll(async () => {
    await testSetup.app.close();
  });

  beforeEach(async () => {
    await deleteAllUsers(testSetup.server, accessToken);
  });

  it('returns a user when found', async () => {
    // Create user via endpoint
    await request(testSetup.server)
      .post('/api/v1/users')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      })
      .expect(201);

    // Find the user to get its ID
    const getUsersRes = await request(testSetup.server)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ email: 'test@example.com' })
      .expect(200);

    const userId = getUsersRes.body.data[0].id;

    const res = await request(testSetup.server)
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.username).toBe('testuser');
    expect(res.body.email).toBe('test@example.com');
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
