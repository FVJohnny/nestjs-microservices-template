import request from 'supertest';
import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { createTestAccessToken, deleteAllUsers } from './utils';

describe('DELETE /users/:userId (E2E)', () => {
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

  it('removes the user and returns 204', async () => {
    const userPayload = {
      email: 'delete-me@example.com',
      username: 'delete-me',
      password: 'Password123!',
    };

    await request(testSetup.server).post('/users').send(userPayload).expect(201);

    const lookup = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ email: userPayload.email })
      .expect(200);

    const userId = lookup.body.data[0].id;

    await request(testSetup.server)
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(testSetup.server)
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('returns 404 when deleting a non-existent user', async () => {
    const accessToken = createTestAccessToken(testSetup.jwtTokenService);
    const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

    await request(testSetup.server)
      .delete(`/users/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
