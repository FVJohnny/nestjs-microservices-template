import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { createTestUsers, deleteUsers, registerAndLogin } from './utils';
import { v4 as uuid } from 'uuid';

describe('GET /users (E2E)', () => {
  let testSetup: E2ETestSetup;
  let accessToken: string;

  beforeAll(async () => {
    testSetup = await createE2ETestApp({ bypassRateLimit: true });
    accessToken = await registerAndLogin(testSetup.agent, 'admin-setup');
  });

  afterAll(async () => {
    await testSetup.app.close();
  });

  it('returns all users when no filters provided', async () => {
    const testId = uuid().substring(0, 5);
    const userData = await createTestUsers(testSetup.agent, accessToken, testId, 3);
    expect(userData).toHaveLength(3);

    const res = await testSetup.agent
      .get('/api/v1/users')
      .query({ username: testId })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);

    const resUsernames = res.body.data.map((u) => u.username);
    const usernames = userData.map((u) => u.username);

    expect(resUsernames.sort()).toEqual(usernames.sort());

    await deleteUsers(
      testSetup.agent,
      accessToken,
      res.body.data.map((u) => u.id),
    );
  });

  it('filters by status', async () => {
    const testId = uuid().substring(0, 5);
    const userData = await createTestUsers(testSetup.agent, accessToken, testId, 1);
    expect(userData).toHaveLength(1);

    const res = await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ username: testId, status: userData[0].status })
      .expect(200);
    expect(res.body.data).toHaveLength(1);

    await deleteUsers(testSetup.agent, accessToken, [res.body.data[0].id]);
  });

  it('supports contains filters: id, email, username', async () => {
    const testId = uuid().substring(0, 5);
    const userData = await createTestUsers(testSetup.agent, accessToken, testId, 3);
    expect(userData).toHaveLength(3);

    const byId = await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ userId: userData[0].id })
      .expect(200);
    expect(byId.body.data).toHaveLength(1);
    expect(byId.body.data[0].username).toBe(userData[0].username);
    expect(byId.body.data[0].email).toBe(userData[0].email);

    const byEmail = await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ email: userData[1].email })
      .expect(200);
    expect(byEmail.body.data).toHaveLength(1);
    expect(byEmail.body.data[0].username).toBe(userData[1].username);
    expect(byEmail.body.data[0].email).toBe(userData[1].email);

    const byUsername = await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ username: userData[2].username })
      .expect(200);
    expect(byUsername.body.data).toHaveLength(1);
    expect(byUsername.body.data[0].username).toBe(userData[2].username);
    expect(byUsername.body.data[0].email).toBe(userData[2].email);

    await deleteUsers(
      testSetup.agent,
      accessToken,
      userData.map((u) => u.id),
    );
  });

  it('filters by role equality', async () => {
    const testId = uuid().substring(0, 5);
    const userData = await createTestUsers(testSetup.agent, accessToken, testId, 3);
    expect(userData).toHaveLength(3);

    const emails = userData.map((u) => u.email);

    const onlyUsers = await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ username: testId, role: 'user' })
      .expect(200);
    expect(onlyUsers.body.data).toHaveLength(3);
    expect(onlyUsers.body.data.map((u) => u.email).sort()).toEqual(emails.sort());

    await deleteUsers(
      testSetup.agent,
      accessToken,
      userData.map((u) => u.id),
    );
  });

  it('orders by username asc and paginates with limit/offset', async () => {
    const testId = uuid().substring(0, 5);
    const userData = await createTestUsers(testSetup.agent, accessToken, testId, 3);
    expect(userData).toHaveLength(3);

    const emails = userData.map((u) => u.email);
    const usernames = userData.map((u) => u.username);

    const orderedAsc = await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ username: testId, orderBy: 'email', orderType: 'asc' })
      .expect(200);

    expect(orderedAsc.body.data.map((u) => u.email)).toEqual(emails.sort());

    const orderedDesc = await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ username: testId, orderBy: 'username', orderType: 'desc' })
      .expect(200);
    expect(orderedDesc.body.data.map((u) => u.username)).toEqual(usernames.sort().reverse());

    const page = await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ username: testId, orderBy: 'username', orderType: 'asc', limit: 2, offset: 1 })
      .expect(200);
    expect(page.body.data.map((u) => u.username)).toEqual(usernames.sort().slice(1, 3));

    const page2 = await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ username: testId, orderBy: 'username', orderType: 'asc', limit: 2, offset: 2 })
      .expect(200);
    expect(page2.body.data.map((u) => u.username)).toEqual(usernames.sort().slice(2, 4));

    await deleteUsers(
      testSetup.agent,
      accessToken,
      userData.map((u) => u.id),
    );
  });

  it('rejects invalid orderType with 422 (validation)', async () => {
    await testSetup.agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ orderBy: 'username', orderType: 'INVALID_ORDER_TYPE' })
      .expect(422);
  });
});
