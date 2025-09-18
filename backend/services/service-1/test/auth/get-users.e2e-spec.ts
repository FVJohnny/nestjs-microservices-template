import request from 'supertest';
import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { createTestAccessToken, deleteAllUsers } from './utils';

describe('GET /users (E2E)', () => {
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

  it('returns all users when no filters provided', async () => {
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!' },
    ];

    for (const data of userData) {
      await request(testSetup.server).post('/users').send(data).expect(201);
    }

    const res = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);
    const usernames = res.body.data.map((u: { username: string }) => u.username).sort();
    expect(usernames).toEqual(['admin', 'user1', 'user2']);
  });

  it('filters by status', async () => {
    await request(testSetup.server)
      .post('/users')
      .send({
        email: 'inactive@example.com',
        username: 'inactive',
        password: 'Password123!',
      })
      .expect(201);

    await request(testSetup.server)
      .post('/users')
      .send({
        email: 'active@example.com',
        username: 'active',
        password: 'Password123!',
      })
      .expect(201);

    const res = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'email-verification-pending' })
      .expect(200);
    expect(res.body.data).toHaveLength(2);

    const res2 = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'active' })
      .expect(200);
    expect(res2.body.data).toHaveLength(0);
  });

  it('supports contains filters: id, email, username', async () => {
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!' },
    ];

    for (const data of userData) {
      await request(testSetup.server).post('/users').send(data).expect(201);
    }

    const adminLookup = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ email: 'admin@' })
      .expect(200);
    const adminId = adminLookup.body.data[0].id;

    const byId = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ userId: adminId })
      .expect(200);
    expect(byId.body.data).toHaveLength(1);
    expect(byId.body.data[0].username).toBe('admin');
    expect(byId.body.data[0].email).toBe('admin@example.com');

    const byEmail = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ email: 'user1' })
      .expect(200);
    expect(byEmail.body.data).toHaveLength(1);
    expect(byEmail.body.data[0].username).toBe('user1');
    expect(byEmail.body.data[0].email).toBe('user1@example.com');

    const byUsername = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ username: 'er2' })
      .expect(200);
    expect(byUsername.body.data).toHaveLength(1);
    expect(byUsername.body.data[0].username).toBe('user2');
    expect(byUsername.body.data[0].email).toBe('user2@example.com');
  });

  it('filters by role equality', async () => {
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!' },
    ];

    for (const data of userData) {
      await request(testSetup.server).post('/users').send(data).expect(201);
    }

    const onlyUsers = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ role: 'user' })
      .expect(200);
    expect(onlyUsers.body.data).toHaveLength(3);
    expect(onlyUsers.body.data.map((u: { email: string }) => u.email).sort()).toEqual([
      'admin@example.com',
      'user1@example.com',
      'user2@example.com',
    ]);

    const onlyAdmins = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ role: 'admin' })
      .expect(200);
    expect(onlyAdmins.body.data).toHaveLength(0);
  });

  it('orders by username asc and paginates with limit/offset', async () => {
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!' },
    ];

    for (const data of userData) {
      await request(testSetup.server).post('/users').send(data).expect(201);
    }

    const orderedAsc = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ orderBy: 'username', orderType: 'asc' })
      .expect(200);
    expect(orderedAsc.body.data.map((u: { username: string }) => u.username)).toEqual([
      'admin',
      'user1',
      'user2',
    ]);

    const orderedDesc = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ orderBy: 'username', orderType: 'desc' })
      .expect(200);
    expect(orderedDesc.body.data.map((u: { username: string }) => u.username)).toEqual([
      'user2',
      'user1',
      'admin',
    ]);

    const page = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ orderBy: 'username', orderType: 'asc', limit: 2, offset: 1 })
      .expect(200);
    expect(page.body.data.map((u: { username: string }) => u.username)).toEqual(['user1', 'user2']);

    const page2 = await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ orderBy: 'username', orderType: 'asc', limit: 2, offset: 2 })
      .expect(200);
    expect(page2.body.data.map((u: { username: string }) => u.username)).toEqual(['user2']);
  });

  it('rejects invalid orderType with 422 (validation)', async () => {
    await request(testSetup.server)
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ orderBy: 'username', orderType: 'INVALID_ORDER_TYPE' })
      .expect(422);
  });
});
