import request from 'supertest';
import { v4 as uuid } from 'uuid';
import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { deleteAllUsers } from './utils';

describe('GET /users/:id (E2E)', () => {
  let testSetup: E2ETestSetup;

  beforeAll(async () => {
    testSetup = await createE2ETestApp();
  });

  afterAll(async () => {
    await testSetup.app.close();
  });

  beforeEach(async () => {
    await deleteAllUsers(testSetup.server);
  });

  it('returns a user when found', async () => {
    // Create user via endpoint
    await request(testSetup.server)
      .post('/users')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    // Find the user to get its ID
    const getUsersRes = await request(testSetup.server)
      .get('/users')
      .query({ email: 'test@example.com' })
      .expect(200);

    const userId = getUsersRes.body.data[0].id;

    const res = await request(testSetup.server).get(`/users/${userId}`).expect(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.username).toBe('testuser');
    expect(res.body.email).toBe('test@example.com');
  });

  it('returns 404 Not Found when not found', async () => {
    await request(testSetup.server).get(`/users/${uuid()}`).expect(404);
  });

  it('returns 422 Unprocessable Entity when invalid id', async () => {
    await request(testSetup.server).get(`/users/invalid-id`).expect(422);
  });
});
