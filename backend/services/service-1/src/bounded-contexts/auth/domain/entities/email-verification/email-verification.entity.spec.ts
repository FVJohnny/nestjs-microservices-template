import { EmailVerification } from './email-verification.entity';
import { Email } from '../../value-objects';
import { EmailVerifiedDomainEvent } from '../../events/email-verified.domain-event';
import { InvalidOperationException } from '@libs/nestjs-common';

describe('EmailVerification Entity', () => {
  describe('Creation', () => {
    it('should create email verification with required properties', () => {
      // Arrange
      const email = new Email('test@example.com');
      const userId = 'user-123';

      // Act
      const emailVerification = EmailVerification.create({
        userId,
        email,
      });

      // Assert
      expect(emailVerification).toBeDefined();
      expect(emailVerification.id).toBeDefined();
      expect(emailVerification.userId).toBe(userId);
      expect(emailVerification.email).toBe(email);
      expect(emailVerification.token).toBeDefined();
      expect(emailVerification.isVerified).toBe(false);
      expect(emailVerification.verifiedAt).toBeUndefined();
      expect(emailVerification.expiresAt).toBeDefined();
      expect(emailVerification.createdAt).toBeDefined();
      expect(emailVerification.updatedAt).toBeDefined();
    });

    it('should create email verification with custom token', () => {
      // Arrange
      const email = new Email('test@example.com');
      const customToken = 'custom-token-123';

      // Act
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
        token: customToken,
      });

      // Assert
      expect(emailVerification.token).toBe(customToken);
    });

    it('should create email verification with custom expiration date', () => {
      // Arrange
      const email = new Email('test@example.com');
      const customExpiration = new Date('2024-12-31T23:59:59Z');

      // Act
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
        expiresAt: customExpiration,
      });

      // Assert
      expect(emailVerification.expiresAt).toBe(customExpiration);
    });

    it('should generate different tokens for different instances', () => {
      // Arrange
      const email = new Email('test@example.com');

      // Act
      const verification1 = EmailVerification.create({
        userId: 'user-1',
        email,
      });
      const verification2 = EmailVerification.create({
        userId: 'user-2',
        email,
      });

      // Assert
      expect(verification1.token).not.toBe(verification2.token);
      expect(verification1.id).not.toBe(verification2.id);
    });

    it('should set expiration 24 hours from creation by default', () => {
      // Arrange
      const beforeCreation = new Date();
      const email = new Email('test@example.com');

      // Act
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
      });

      // Assert
      const expectedExpiration = new Date(beforeCreation.getTime() + 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(emailVerification.expiresAt.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(5000); // 5 seconds tolerance
    });
  });

  describe('Verification Process', () => {
    it('should successfully verify pending email verification', () => {
      // Arrange
      const email = new Email('test@example.com');
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
      });

      // Act
      emailVerification.verify();

      // Assert
      expect(emailVerification.isVerified).toBe(true);
      expect(emailVerification.verifiedAt).toBeDefined();
      expect(emailVerification.verifiedAt).toBeInstanceOf(Date);
    });

    it('should emit EmailVerifiedDomainEvent when verified', () => {
      // Arrange
      const email = new Email('test@example.com');
      const userId = 'user-123';
      const emailVerification = EmailVerification.create({
        userId,
        email,
      });

      // Act
      emailVerification.verify();

      // Assert
      const events = emailVerification.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(EmailVerifiedDomainEvent);
      
      const domainEvent = events[0] as EmailVerifiedDomainEvent;
      expect(domainEvent.aggregateId).toBe(emailVerification.id);
      expect(domainEvent.userId).toBe(userId);
      expect(domainEvent.email).toBe('test@example.com');
    });

    it('should throw error when trying to verify already verified email', () => {
      // Arrange
      const email = new Email('test@example.com');
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
      });
      emailVerification.verify(); // First verification

      // Act & Assert
      expect(() => emailVerification.verify()).toThrow(InvalidOperationException);
    });

    it('should throw error when trying to verify expired email verification', () => {
      // Arrange
      const email = new Email('test@example.com');
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
        expiresAt: pastDate,
      });

      // Act & Assert
      expect(() => emailVerification.verify()).toThrow(InvalidOperationException);
    });

    it('should update timestamps when verified', async () => {
      // Arrange
      const email = new Email('test@example.com');
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
      });
      const originalUpdatedAt = emailVerification.updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Act
      emailVerification.verify();

      // Assert
      expect(emailVerification.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('State Queries', () => {
    it('should correctly identify expired email verification', () => {
      // Arrange
      const email = new Email('test@example.com');
      const pastDate = new Date(Date.now() - 1000);
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
        expiresAt: pastDate,
      });

      // Act & Assert
      expect(emailVerification.isExpired()).toBe(true);
      expect(emailVerification.isPending()).toBe(false);
    });

    it('should correctly identify pending email verification', () => {
      // Arrange
      const email = new Email('test@example.com');
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
        expiresAt: futureDate,
      });

      // Act & Assert
      expect(emailVerification.isExpired()).toBe(false);
      expect(emailVerification.isPending()).toBe(true);
    });

    it('should correctly identify verified email verification as not pending', () => {
      // Arrange
      const email = new Email('test@example.com');
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
      });
      emailVerification.verify();

      // Act & Assert
      expect(emailVerification.isPending()).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should convert to DTO correctly', () => {
      // Arrange
      const email = new Email('test@example.com');
      const userId = 'user-123';
      const customToken = 'custom-token';
      const customExpiration = new Date('2024-12-31T23:59:59Z');

      const emailVerification = EmailVerification.create({
        userId,
        email,
        token: customToken,
        expiresAt: customExpiration,
      });

      // Act
      const dto = emailVerification.toValue();

      // Assert
      expect(dto).toEqual({
        id: emailVerification.id,
        userId,
        email: 'test@example.com',
        token: customToken,
        expiresAt: customExpiration,
        isVerified: false,
        verifiedAt: undefined,
        createdAt: emailVerification.createdAt,
        updatedAt: emailVerification.updatedAt,
      });
    });

    it('should create from DTO correctly', () => {
      // Arrange
      const dto = {
        id: 'verification-123',
        userId: 'user-123',
        email: 'test@example.com',
        token: 'token-123',
        expiresAt: new Date('2024-12-31T23:59:59Z'),
        isVerified: true,
        verifiedAt: new Date('2024-01-01T12:00:00Z'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      };

      // Act
      const emailVerification = EmailVerification.fromValue(dto);

      // Assert
      expect(emailVerification.id).toBe(dto.id);
      expect(emailVerification.userId).toBe(dto.userId);
      expect(emailVerification.email.toValue()).toBe(dto.email);
      expect(emailVerification.token).toBe(dto.token);
      expect(emailVerification.expiresAt).toEqual(dto.expiresAt);
      expect(emailVerification.isVerified).toBe(dto.isVerified);
      expect(emailVerification.verifiedAt).toEqual(dto.verifiedAt);
      expect(emailVerification.createdAt).toEqual(dto.createdAt);
      expect(emailVerification.updatedAt).toEqual(dto.updatedAt);
    });

    it('should handle DTO with undefined verifiedAt', () => {
      // Arrange
      const dto = {
        id: 'verification-123',
        userId: 'user-123',
        email: 'test@example.com',
        token: 'token-123',
        expiresAt: new Date('2024-12-31T23:59:59Z'),
        isVerified: false,
        verifiedAt: undefined,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      };

      // Act
      const emailVerification = EmailVerification.fromValue(dto);

      // Assert
      expect(emailVerification.verifiedAt).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle email verification that expires exactly now', () => {
      // Arrange
      const email = new Email('test@example.com');
      const pastTime = new Date(Date.now() - 1); // 1ms ago
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
        expiresAt: pastTime,
      });

      // Act & Assert
      expect(emailVerification.isExpired()).toBe(true);
    });

    it('should handle very long email addresses', () => {
      // Arrange
      const longEmail = 'very.long.email.address.with.many.parts@very.long.subdomain.domain.com';
      const email = new Email(longEmail);

      // Act
      const emailVerification = EmailVerification.create({
        userId: 'user-123',
        email,
      });

      // Assert
      expect(emailVerification.email.toValue()).toBe(longEmail);
    });

    it('should handle special characters in user ID', () => {
      // Arrange
      const specialUserId = 'user-123-äöü-@#$%';
      const email = new Email('test@example.com');

      // Act
      const emailVerification = EmailVerification.create({
        userId: specialUserId,
        email,
      });

      // Assert
      expect(emailVerification.userId).toBe(specialUserId);
    });
  });
});