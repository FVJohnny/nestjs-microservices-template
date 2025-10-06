import { v4 as uuid } from 'uuid';
import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { createTestUsers, deleteUsers, registerAndLogin } from './utils';

describe('GET /users/:id (E2E)', () => {
  let testSetup: E2ETestSetup;
  let accessToken: string;

  beforeAll(async () => {
    testSetup = await createE2ETestApp({ bypassRateLimit: true });
    accessToken = await registerAndLogin(testSetup.agent, 'admin-setup');
  });

  afterAll(async () => {
    await testSetup.app.close();
  });

  it('returns a user when found', async () => {
    // Create user via endpoint
    const testId = uuid().substring(0, 5);
    const userData = await createTestUsers(testSetup.agent, accessToken, testId, 1);

    const res = await testSetup.agent
      .get(`/api/v1/users/${userData[0].id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.id).toBe(userData[0].id);
    expect(res.body.username).toBe(userData[0].username);
    expect(res.body.email).toBe(userData[0].email);

    await deleteUsers(testSetup.agent, accessToken, [userData[0].id]);
  });

  it('returns 404 Not Found when not found', async () => {
    await testSetup.agent
      .get(`/api/v1/users/${uuid()}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('returns 422 Unprocessable Entity when invalid id', async () => {
    await testSetup.agent
      .get(`/api/v1/users/invalid-id`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(422);
  });
});
