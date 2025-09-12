import { EmailVerification } from './email-verification.entity';
import { Email } from '../../value-objects';
import { EmailVerificationVerifiedDomainEvent } from '../../events/email-verified.domain-event';
import { EmailVerificationCreatedDomainEvent } from '../../events/email-verification-created.domain-event';
import { InvalidOperationException } from '@libs/nestjs-common';

describe('EmailVerification Entity', () => {
  // Test data factory
  const createTestEmail = (address = 'test@example.com') => new Email(address);
  const createTestVerification = (overrides = {}) =>
    EmailVerification.create({
      userId: 'user-123',
      email: createTestEmail(),
      ...overrides,
    });

  describe('Creation', () => {
    it('should create with default values', () => {
      const email = createTestEmail();
      const userId = 'user-123';

      const verification = EmailVerification.create({ userId, email });

      expect(verification.id).toBeDefined();
      expect(verification.userId).toBe(userId);
      expect(verification.email).toBe(email);
      expect(verification.token).toBeDefined();
      expect(verification.isVerified).toBe(false);
      expect(verification.verifiedAt).toBeUndefined();
      expect(verification.expiresAt).toBeDefined();
      expect(verification.createdAt).toBeDefined();
      expect(verification.updatedAt).toBeDefined();
    });

    it('should accept custom token and expiration', () => {
      const customToken = 'custom-token-123';
      const customExpiration = new Date('2024-12-31T23:59:59Z');

      const verification = createTestVerification({
        token: customToken,
        expiresAt: customExpiration,
      });

      expect(verification.token).toBe(customToken);
      expect(verification.expiresAt).toBe(customExpiration);
    });

    it('should generate unique identifiers', () => {
      const verification1 = createTestVerification({ userId: 'user-1' });
      const verification2 = createTestVerification({ userId: 'user-2' });

      expect(verification1.token).not.toBe(verification2.token);
      expect(verification1.id).not.toBe(verification2.id);
    });

    it('should set default expiration to 24 hours', () => {
      const beforeCreation = new Date();
      const verification = createTestVerification();
      const expectedExpiration = new Date(beforeCreation.getTime() + 24 * 60 * 60 * 1000);

      const timeDiff = Math.abs(
        verification.expiresAt.getTime() - expectedExpiration.getTime(),
      );
      expect(timeDiff).toBeLessThan(5000); // 5 seconds tolerance
    });

    it('should emit EmailVerificationCreatedDomainEvent', () => {
      const email = createTestEmail();
      const userId = 'user-123';

      const verification = EmailVerification.create({ userId, email });
      const events = verification.getUncommittedEvents();

      expect(events).toHaveLength(1);
      const event = events[0] as EmailVerificationCreatedDomainEvent;
      expect(event).toBeInstanceOf(EmailVerificationCreatedDomainEvent);
      expect(event.userId).toBe(userId);
      expect(event.email).toBe(email.toValue());
      expect(event.token).toBe(verification.token);
      expect(event.expiresAt).toBe(verification.expiresAt);
    });
  });

  describe('Verification', () => {
    it('should verify successfully', () => {
      const verification = createTestVerification();

      verification.verify();

      expect(verification.isVerified).toBe(true);
      expect(verification.verifiedAt).toBeInstanceOf(Date);
    });

    it('should emit EmailVerificationVerifiedDomainEvent', () => {
      const email = createTestEmail();
      const userId = 'user-123';
      const verification = EmailVerification.create({ userId, email });

      verification.verify();
      const events = verification.getUncommittedEvents();

      expect(events).toHaveLength(2); // Created + Verified
      const verifiedEvent = events[1] as EmailVerificationVerifiedDomainEvent;
      expect(verifiedEvent).toBeInstanceOf(EmailVerificationVerifiedDomainEvent);
      expect(verifiedEvent.userId).toBe(userId);
      expect(verifiedEvent.email).toBe(email.toValue());
    });

    it('should prevent double verification', () => {
      const verification = createTestVerification();
      verification.verify();

      expect(() => verification.verify()).toThrow(InvalidOperationException);
    });

    it('should prevent verification of expired tokens', () => {
      const expiredVerification = createTestVerification({
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      expect(() => expiredVerification.verify()).toThrow(InvalidOperationException);
    });

    it('should update timestamps on verification', async () => {
      const verification = createTestVerification();
      const originalUpdatedAt = verification.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      verification.verify();

      expect(verification.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('State Queries', () => {
    it('should identify expired verification', () => {
      const verification = createTestVerification({
        expiresAt: new Date(Date.now() - 1000),
      });

      expect(verification.isExpired()).toBe(true);
      expect(verification.isPending()).toBe(false);
    });

    it('should identify pending verification', () => {
      const verification = createTestVerification({
        expiresAt: new Date(Date.now() + 60000),
      });

      expect(verification.isExpired()).toBe(false);
      expect(verification.isPending()).toBe(true);
    });

    it('should identify verified as not pending', () => {
      const verification = createTestVerification();
      verification.verify();

      expect(verification.isPending()).toBe(false);
    });
  });

  describe('Serialization', () => {
    const createTestDto = () => ({
      id: 'verification-123',
      userId: 'user-123',
      email: 'test@example.com',
      token: 'token-123',
      expiresAt: new Date('2024-12-31T23:59:59Z'),
      isVerified: false,
      verifiedAt: undefined,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    });

    it('should convert to DTO', () => {
      const email = createTestEmail();
      const userId = 'user-123';
      const token = 'custom-token';
      const expiresAt = new Date('2024-12-31T23:59:59Z');

      const verification = EmailVerification.create({
        userId,
        email,
        token,
        expiresAt,
      });

      const dto = verification.toValue();

      expect(dto).toEqual({
        id: verification.id,
        userId,
        email: email.toValue(),
        token,
        expiresAt,
        isVerified: false,
        verifiedAt: undefined,
        createdAt: verification.createdAt,
        updatedAt: verification.updatedAt,
      });
    });

    it('should create from DTO', () => {
      const dto = {
        ...createTestDto(),
        isVerified: true,
        verifiedAt: new Date('2024-01-01T12:00:00Z'),
      };

      const verification = EmailVerification.fromValue(dto);

      expect(verification.id).toBe(dto.id);
      expect(verification.userId).toBe(dto.userId);
      expect(verification.email.toValue()).toBe(dto.email);
      expect(verification.token).toBe(dto.token);
      expect(verification.expiresAt).toEqual(dto.expiresAt);
      expect(verification.isVerified).toBe(dto.isVerified);
      expect(verification.verifiedAt).toEqual(dto.verifiedAt);
    });

    it('should handle undefined verifiedAt', () => {
      const dto = createTestDto();

      const verification = EmailVerification.fromValue(dto);

      expect(verification.verifiedAt).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle expiration at current time', () => {
      const verification = createTestVerification({
        expiresAt: new Date(Date.now() - 1),
      });

      expect(verification.isExpired()).toBe(true);
    });

    it('should handle long email addresses', () => {
      const longEmail = 'very.long.email.address.with.many.parts@very.long.subdomain.domain.com';
      const email = createTestEmail(longEmail);

      const verification = createTestVerification({ email });

      expect(verification.email.toValue()).toBe(longEmail);
    });
  });
});