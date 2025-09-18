import request from 'supertest';
import { createE2ETestApp, type E2ETestSetup } from '../utils/e2e-test-setup';
import { deleteAllUsers } from './utils';

describe('GET /users (E2E)', () => {
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

  it('returns all users when no filters provided', async () => {
    // Arrange: create users via endpoints
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!', role: 'admin' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!', role: 'user' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!', role: 'user' },
    ];

    for (const data of userData) {
      await request(testSetup.server).post('/users').send(data).expect(201);
    }

    // Act
    const res = await request(testSetup.server).get('/users').expect(200);

    // Assert
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);
    const usernames = res.body.data.map((u: any) => u.username).sort();
    expect(usernames).toEqual(['admin', 'user1', 'user2']);
  });

  it('filters by status', async () => {
    // Create users via endpoints
    await request(testSetup.server)
      .post('/users')
      .send({
        email: 'inactive@example.com',
        username: 'inactive',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    await request(testSetup.server)
      .post('/users')
      .send({
        email: 'active@example.com',
        username: 'active',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    const res = await request(testSetup.server)
      .get('/users')
      .query({ status: 'email-verification-pending' })
      .expect(200);
    expect(res.body.data).toHaveLength(2);

    const res2 = await request(testSetup.server)
      .get('/users')
      .query({ status: 'active' })
      .expect(200);
    expect(res2.body.data).toHaveLength(0);
  });

  it('supports contains filters: id, email, username', async () => {
    // Create users via endpoints
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!', role: 'admin' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!', role: 'user' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!', role: 'user' },
    ];

    for (const data of userData) {
      await request(testSetup.server).post('/users').send(data).expect(201);
    }

    const adminLookup = await request(testSetup.server)
      .get('/users')
      .query({ email: 'admin@example.com' })
      .expect(200);
    const adminId = adminLookup.body.data[0].id;

    const byId = await request(testSetup.server)
      .get('/users')
      .query({ userId: adminId })
      .expect(200);
    expect(byId.body.data).toHaveLength(1);
    expect(byId.body.data[0].username).toBe('admin');

    const byEmail = await request(testSetup.server)
      .get('/users')
      .query({ email: 'user1' })
      .expect(200);
    expect(byEmail.body.data).toHaveLength(1);
    expect(byEmail.body.data[0].username).toBe('user1');

    const byUsername = await request(testSetup.server)
      .get('/users')
      .query({ username: 'user2' })
      .expect(200);
    expect(byUsername.body.data).toHaveLength(1);
    expect(byUsername.body.data[0].username).toBe('user2');
  });

  it('filters by role equality', async () => {
    // Create users via endpoints
    await request(testSetup.server)
      .post('/users')
      .send({
        email: 'admin@example.com',
        username: 'admin',
        password: 'Password123!',
        role: 'admin',
      })
      .expect(201);

    await request(testSetup.server)
      .post('/users')
      .send({
        email: 'user@example.com',
        username: 'user',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    const onlyAdmins = await request(testSetup.server)
      .get('/users')
      .query({ role: 'admin' })
      .expect(200);
    expect(onlyAdmins.body.data).toHaveLength(1);
    expect(onlyAdmins.body.data[0].username).toBe('admin');

    const onlyUsers = await request(testSetup.server)
      .get('/users')
      .query({ role: 'user' })
      .expect(200);
    expect(onlyUsers.body.data).toHaveLength(1);
    expect(onlyUsers.body.data[0].username).toBe('user');
  });

  it('orders by username asc and paginates with limit/offset', async () => {
    // Create users via endpoints
    const userData = [
      { email: 'admin@example.com', username: 'admin', password: 'Password123!', role: 'admin' },
      { email: 'user1@example.com', username: 'user1', password: 'Password123!', role: 'user' },
      { email: 'user2@example.com', username: 'user2', password: 'Password123!', role: 'user' },
    ];

    for (const data of userData) {
      await request(testSetup.server).post('/users').send(data).expect(201);
    }

    const orderedAsc = await request(testSetup.server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'asc' })
      .expect(200);
    expect(orderedAsc.body.data.map((u: any) => u.username)).toEqual(['admin', 'user1', 'user2']);

    const orderedDesc = await request(testSetup.server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'desc' })
      .expect(200);
    expect(orderedDesc.body.data.map((u: any) => u.username)).toEqual(['user2', 'user1', 'admin']);

    const pageParams = {
      orderBy: 'username',
      orderType: 'asc',
      limit: 2,
      offset: 1,
    };
    const page = await request(testSetup.server).get('/users').query(pageParams).expect(200);
    expect(page.body.data.map((u: any) => u.username)).toEqual(['user1', 'user2']);
  });

  it('rejects invalid orderType with 422 (validation)', async () => {
    // Create a user via endpoint
    await request(testSetup.server)
      .post('/users')
      .send({
        email: 'alpha@example.com',
        username: 'alpha',
        password: 'Password123!',
        role: 'user',
      })
      .expect(201);

    await request(testSetup.server)
      .get('/users')
      .query({ orderBy: 'username', orderType: 'INVALID_ORDER_TYPE' })
      .expect(422);
  });
});
