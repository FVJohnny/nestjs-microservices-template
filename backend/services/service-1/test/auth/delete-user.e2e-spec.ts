import { v4 as uuid } from 'uuid';
import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { createTestUsers, registerAndLogin } from './e2e.util';

describe('DELETE /users/:userId (E2E)', () => {
  let testSetup: E2ETestSetup;
  let accessToken: string;

  beforeAll(async () => {
    testSetup = await createE2ETestApp({ bypassRateLimit: true });
    accessToken = await registerAndLogin(testSetup.agent, 'admin-setup');
  });

  afterAll(async () => {
    await testSetup.app.close();
  });

  it('removes the user and returns 204', async () => {
    const testId = uuid().substring(0, 5);

    const userData = await createTestUsers(testSetup.agent, accessToken, testId, 1);

    await testSetup.agent
      .delete(`/api/v1/users/${userData[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await testSetup.agent
      .get(`/api/v1/users/${userData[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('returns 404 when deleting a non-existent user', async () => {
    const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

    await testSetup.agent
      .delete(`/api/v1/users/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
