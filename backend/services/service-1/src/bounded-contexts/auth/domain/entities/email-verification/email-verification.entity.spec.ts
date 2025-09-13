import { EmailVerification } from './email-verification.entity';
import { Email } from '../../value-objects';
import { EmailVerificationVerifiedDomainEvent } from '../../events/email-verified.domain-event';
import { EmailVerificationCreatedDomainEvent } from '../../events/email-verification-created.domain-event';
import { InvalidOperationException, Id } from '@libs/nestjs-common';

describe('EmailVerification Entity', () => {
  const newTestVerification = ({ expired = false, verified = false }: { expired?: boolean, verified?: boolean }) =>
    new EmailVerification({
      id: Id.random(),
      userId: Id.random(),
      email: Email.random(),
      token: Id.random(),
      expiresAt: expired ? new Date(Date.now() - 1) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      verifiedAt: verified ? new Date() : new Date(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  describe('Creation', () => {
    it('should create with default values', () => {
      const email = Email.random();
      const userId = Id.random();

      const verification = EmailVerification.create({ userId, email });

      expect(verification.id).toBeDefined();
      expect(verification.userId).toBe(userId);
      expect(verification.email).toBe(email);
      expect(verification.token).toBeInstanceOf(Id);
      expect(verification.verifiedAt).toEqual(new Date(0));
      expect(verification.expiresAt).toBeInstanceOf(Date);
      expect(verification.createdAt).toBeInstanceOf(Date);
      expect(verification.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique identifiers', () => {
      const verification1 = EmailVerification.create({
        userId: Id.random(),
        email: Email.random(),
      });
      const verification2 = EmailVerification.create({
        userId: Id.random(),
        email: Email.random(),
      });

      expect(verification1.token).not.toBe(verification2.token);
      expect(verification1.id).not.toBe(verification2.id);
    });

    it('should set default expiration to 24 hours', () => {
      const beforeCreation = new Date();
      const verification = EmailVerification.create({
        userId: Id.random(),
        email: Email.random(),
      });
      const expectedExpiration = new Date(beforeCreation.getTime() + 24 * 60 * 60 * 1000);

      const timeDiff = Math.abs(
        verification.expiresAt.getTime() - expectedExpiration.getTime(),
      );
      expect(timeDiff).toBeLessThan(5000); // 5 seconds tolerance
    });

    it('should emit EmailVerificationCreatedDomainEvent', () => {
      const emailVerification = EmailVerification.create({
        userId: Id.random(),
        email: Email.random(),
      });
      const events = emailVerification.getUncommittedEvents();

      expect(events).toHaveLength(1);
      const event = events[0] as EmailVerificationCreatedDomainEvent;
      expect(event).toBeInstanceOf(EmailVerificationCreatedDomainEvent);
      expect(event.userId).toBe(emailVerification.userId);
      expect(event.email).toBe(emailVerification.email);
      expect(event.token).toBeInstanceOf(Id);
      expect(event.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('Verification', () => {
    it('should verify successfully', () => {
      const verification = newTestVerification({});

      expect(verification.isVerified()).toBe(false);

      verification.verify();

      expect(verification.isVerified()).toBe(true);
    });

    it('should emit EmailVerificationVerifiedDomainEvent', () => {
      const verification = newTestVerification({});
      verification.verify();
      const events = verification.getUncommittedEvents();
      const verifiedEvent = events[0] as EmailVerificationVerifiedDomainEvent;

      expect(verifiedEvent).toBeInstanceOf(EmailVerificationVerifiedDomainEvent);
      expect(verifiedEvent.userId).toBe(verification.userId);
      expect(verifiedEvent.email).toBe(verification.email);
    });

    it('should prevent double verification', () => {
      const verification = newTestVerification({
        verified: false,
      });
      verification.verify();

      expect(() => verification.verify()).toThrow(InvalidOperationException);
    });

    it('should prevent verification of expired tokens', () => {
      const expiredVerification = newTestVerification({ expired: true });

      expect(() => expiredVerification.verify()).toThrow(InvalidOperationException);
    });

    it('should update timestamps on verification', async () => {
      const verification = newTestVerification({});
      const originalUpdatedAt = verification.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      verification.verify();

      expect(verification.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('State Queries', () => {
    it('should identify expired verification', () => {
      const verification = newTestVerification({ expired: true });

      expect(verification.isVerified()).toBe(false);
      expect(verification.isPending()).toBe(false);
      expect(verification.isExpired()).toBe(true);
    });

    it('should identify pending verification', () => {
      const verification = newTestVerification({});

      expect(verification.isExpired()).toBe(false);
      expect(verification.isVerified()).toBe(false);
      expect(verification.isPending()).toBe(true);
    });

    it('should identify verified as not pending', () => {
      const verification = newTestVerification({ verified: true });

      expect(verification.isPending()).toBe(false);
      expect(verification.isExpired()).toBe(false);
      expect(verification.isVerified()).toBe(true);
    });
  });

  describe('Serialization', () => {
    const createTestDto = () => ({
      id: Id.random().toValue(),
      userId: Id.random().toValue(),
      email: Email.random().toValue(),
      token: Id.random().toValue(),
      expiresAt: new Date('2024-12-31T23:59:59Z'),
      verifiedAt: new Date(0),
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    });

    it('should convert to DTO', () => {
      const emailVerification = newTestVerification({});

      const dto = emailVerification.toValue();

      expect(dto).toEqual({
        id: emailVerification.id.toValue(),
        userId: emailVerification.userId.toValue(),
        email: emailVerification.email.toValue(),
        token: emailVerification.token.toValue(),
        expiresAt: emailVerification.expiresAt,
        verifiedAt: emailVerification.verifiedAt,
        createdAt: emailVerification.createdAt,
        updatedAt: emailVerification.updatedAt,
      });
    });

    it('should create from DTO', () => {
      const dto = createTestDto();
      const verification = EmailVerification.fromValue(dto);

      expect(verification.id.toValue()).toBe(dto.id);
      expect(verification.userId.toValue()).toBe(dto.userId);
      expect(verification.email.toValue()).toBe(dto.email);
      expect(verification.token.toValue()).toBe(dto.token);
      expect(verification.expiresAt).toEqual(dto.expiresAt);
      expect(verification.verifiedAt).toEqual(dto.verifiedAt);
    });
  });
});