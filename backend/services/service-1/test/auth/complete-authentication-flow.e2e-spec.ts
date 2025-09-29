import request from 'supertest';
import { createE2ETestApp, type E2ETestSetup } from '../e2e-test-setup';
import { createTestAccessToken, createTestUsers } from './utils';

describe('Complete Authentication Flow (E2E)', () => {
  let testSetup: E2ETestSetup;
  let accessToken: string;

  beforeAll(async () => {
    testSetup = await createE2ETestApp({ bypassRateLimit: true });
    accessToken = createTestAccessToken(testSetup.jwtTokenService);
  });

  afterAll(async () => {
    await testSetup.app.close();
  });

  describe('Complete Happy Path Flow', () => {
    it('should complete full authentication journey: register → verify → login → refresh', async () => {
      const [user] = await createTestUsers(testSetup.agent, accessToken, 'happy-path', 1);
      // Step 2: Get Email Verification via API
      const emailVerificationRes = await testSetup.agent
        .get(`/api/v1/email-verification`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ userId: user.id })
        .expect(200);
      const emailVerificationId = emailVerificationRes.body.id;
      expect(emailVerificationId).toBeDefined();
      expect(emailVerificationRes.body.userId).toBe(user.id);
      expect(emailVerificationRes.body.email).toBe(user.email);

      // Step 3: Verify Email
      await testSetup.agent
        .post('/api/v1/email-verification/verify')
        .send({ emailVerificationId })
        .expect(200);

      // Verify user status changed to active
      const updatedUserRes = await testSetup.agent
        .get(`/api/v1/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(updatedUserRes.body.status).toBe('active');

      // Step 4: Login with Verified Account
      const loginRes = await testSetup.agent
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      // Verify login response structure
      expect(typeof loginRes.body.accessToken).toBe('string');
      expect(typeof loginRes.body.refreshToken).toBe('string');

      // Step 5: Refresh Token
      const refreshToken = loginRes.body.refreshToken;
      const refreshRes = await testSetup.agent
        .post('/api/v1/auth/refresh-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Verify refresh response
      expect(typeof refreshRes.body.accessToken).toBe('string');
      expect(typeof refreshRes.body.refreshToken).toBe('string');

      // Verify refresh tokens are different from original
      expect(refreshRes.body.accessToken).not.toBe(accessToken);
      expect(refreshRes.body.refreshToken).not.toBe(refreshToken);
    });
  });

  describe('Registration Error Cases', () => {
    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'Password123!',
      };

      // First registration should succeed
      await testSetup.agent.post('/api/v1/users').send(userData).expect(201);

      // Second registration with same email should fail
      await testSetup.agent
        .post('/api/v1/users')
        .send({ ...userData, username: 'user2' })
        .expect(409);
    });

    it('should validate user input properly', async () => {
      // Invalid email format
      await testSetup.agent
        .post('/api/v1/users')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'ValidPassword123!',
        })
        .expect(422);

      // Missing required fields
      await testSetup.agent.post('/api/v1/users').send({}).expect(400);
    });
  });

  describe('Email Verification Error Cases', () => {
    it('should return 404 for non-existent verification ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174999';
      await testSetup.agent
        .post('/api/v1/email-verification/verify')
        .send({ emailVerificationId: nonExistentId })
        .expect(404);
    });

    it('should return 404 for non-existent verification with specified user ID', async () => {
      const nonExistentUserId = '123e4567-e89b-12d3-a456-426614174999';
      await testSetup.agent
        .get(`/api/v1/email-verification/user/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should prevent double email verification', async () => {
      const userData = {
        email: 'double@example.com',
        username: 'doubleuser',
        password: 'Password123!',
      };

      // Register user
      await testSetup.agent.post('/api/v1/users').send(userData).expect(201);

      // Get user
      const getUsersRes = await testSetup.agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ email: userData.email })
        .expect(200);
      const userId = getUsersRes.body.data[0].id;

      // Get verification
      const verificationRes = await testSetup.agent
        .get(`/api/v1/email-verification`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ userId })
        .expect(200);
      const emailVerificationId = verificationRes.body.id;

      // First verification should succeed. Second verification should fail.
      await testSetup.agent
        .post('/api/v1/email-verification/verify')
        .send({ emailVerificationId })
        .expect(200);
      await testSetup.agent
        .post('/api/v1/email-verification/verify')
        .send({ emailVerificationId })
        .expect(400);
    });
  });

  describe('Login Error Cases', () => {
    it('should reject login with unverified email', async () => {
      const userData = {
        email: 'unverified@example.com',
        username: 'unverifieduser',
        password: 'Password123!',
      };

      // Register user but don't verify email
      await testSetup.agent.post('/api/v1/users').send(userData).expect(201);

      // Login should fail
      await testSetup.agent
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(401);
    });

    it('should reject login with wrong credentials', async () => {
      const userData = {
        email: 'wrongcreds@example.com',
        username: 'wrongcredsuser',
        password: 'CorrectPassword123!',
      };

      // Complete registration and verification
      await testSetup.agent.post('/api/v1/users').send(userData).expect(201);

      const getUsersRes = await testSetup.agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ email: userData.email })
        .expect(200);
      const userId = getUsersRes.body.data[0].id;

      const verificationRes = await testSetup.agent
        .get(`/api/v1/email-verification`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ userId })
        .expect(200);
      const emailVerificationId = verificationRes.body.id;

      await testSetup.agent
        .post('/api/v1/email-verification/verify')
        .send({ emailVerificationId })
        .expect(200);

      // Wrong password
      await testSetup.agent
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Wrong email
      await testSetup.agent
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@example.com',
          password: userData.password,
        })
        .expect(401);
    });

    it('should validate login input properly', async () => {
      // Invalid email format
      await testSetup.agent
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: 'ValidPassword123!',
        })
        .expect(422);

      // Missing password
      await testSetup.agent
        .post('/api/v1/auth/login')
        .send({
          email: 'valid@example.com',
        })
        .expect(400);
    });
  });

  describe('Token Refresh Error Cases', () => {
    it('should reject invalid refresh tokens', async () => {
      // Invalid refresh token format
      await testSetup.agent
        .post('/api/v1/auth/refresh-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      // Missing refresh token
      await testSetup.agent
        .post('/api/v1/auth/refresh-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });
});
