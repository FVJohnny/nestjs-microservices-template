import request from 'supertest';
import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { createTestAccessToken, createTestUsers, deleteUsers } from './utils';

describe('DELETE /users/:userId (E2E)', () => {
  let testSetup: E2ETestSetup;
  let accessToken: string;

  beforeAll(async () => {
    testSetup = await createE2ETestApp({ bypassRateLimit: true });
    accessToken = createTestAccessToken(testSetup.jwtTokenService);
  });

  afterAll(async () => {
    await testSetup.app.close();
  });

  it('removes the user and returns 204', async () => {
    const userData = await createTestUsers(testSetup.server, accessToken, 1);

    await request(testSetup.server)
      .delete(`/api/v1/users/${userData[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(testSetup.server)
      .get(`/api/v1/users/${userData[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('returns 404 when deleting a non-existent user', async () => {
    const accessToken = createTestAccessToken(testSetup.jwtTokenService);
    const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

    await request(testSetup.server)
      .delete(`/api/v1/users/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
