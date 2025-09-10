import type { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerification } from '../../entities/email-verification/email-verification.entity';
import { Email } from '../../value-objects/email.vo';
import { AlreadyExistsException } from '@libs/nestjs-common';

/**
 * Basic validation test to prevent Jest "no tests found" error
 */
describe('EmailVerificationRepository Contract Test Suite', () => {
  it('exports testEmailVerificationRepositoryContract function', () => {
    expect(typeof testEmailVerificationRepositoryContract).toBe('function');
  });
});

/**
 * Shared test suite for EmailVerificationRepository implementations.
 * This ensures all implementations behave consistently and meet the interface contract.
 *
 * @param description Name of the implementation being tested
 * @param createRepository Factory function to create a repository with optional test data
 * @param setupTeardown Optional setup and teardown functions for the repository
 */
export function testEmailVerificationRepositoryContract(
  description: string,
  createRepository: (
    verifications?: EmailVerification[],
  ) => Promise<EmailVerificationRepository>,
  setupTeardown?: {
    beforeAll?: () => Promise<void>;
    afterAll?: () => Promise<void>;
    beforeEach?: () => Promise<void>;
    afterEach?: () => Promise<void>;
  },
) {
  describe(`EmailVerificationRepository Contract: ${description}`, () => {
    let repository: EmailVerificationRepository;

    if (setupTeardown?.beforeAll) {
      beforeAll(setupTeardown.beforeAll);
    }

    if (setupTeardown?.afterAll) {
      afterAll(setupTeardown.afterAll);
    }

    beforeEach(async () => {
      if (setupTeardown?.beforeEach) {
        await setupTeardown.beforeEach();
      }
      repository = await createRepository();
    });

    if (setupTeardown?.afterEach) {
      afterEach(setupTeardown.afterEach);
    }

    describe('Basic CRUD Operations', () => {
      describe('save', () => {
        it('should save a new email verification successfully', async () => {
          // Arrange
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
          });

          // Act
          await repository.save(verification);

          // Assert
          const savedVerification = await repository.findByUserId(verification.userId);
          expect(savedVerification).not.toBeNull();
          expect(savedVerification?.id).toBe(verification.id);
          expect(savedVerification?.userId).toBe(verification.userId);
          expect(savedVerification?.email.toValue()).toBe('test@example.com');
        });

        it('should update an existing verification when saving with same id', async () => {
          // Arrange
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
          });
          await repository.save(verification);

          // Modify verification
          verification.verify();

          // Act
          await repository.save(verification);

          // Assert
          const savedVerification = await repository.findByUserId(verification.userId);
          expect(savedVerification).not.toBeNull();
          expect(savedVerification?.isVerified).toBe(true);
        });

        it('should throw AlreadyExistsException when saving verification for user that already has one', async () => {
          // Arrange
          const verification1 = EmailVerification.create({
            userId: 'user-123',
            email: new Email('first@example.com'),
          });
          const verification2 = EmailVerification.create({
            userId: 'user-123',
            email: new Email('second@example.com'),
          });

          // Act
          await repository.save(verification1);

          // Assert
          await expect(repository.save(verification2)).rejects.toThrow(AlreadyExistsException);
        });

        it('should throw AlreadyExistsException when saving verification with same email for different users', async () => {
          // Arrange
          const verification1 = EmailVerification.create({
            userId: 'user-1',
            email: new Email('same@example.com'),
          });
          const verification2 = EmailVerification.create({
            userId: 'user-2',
            email: new Email('same@example.com'),
          });

          // Act
          await repository.save(verification1);

          // Assert
          await expect(repository.save(verification2)).rejects.toThrow(AlreadyExistsException);
        });

        it('should allow saving multiple verifications for different users with different emails', async () => {
          // Arrange
          const verification1 = EmailVerification.create({
            userId: 'user-1',
            email: new Email('user1@example.com'),
          });
          const verification2 = EmailVerification.create({
            userId: 'user-2',
            email: new Email('user2@example.com'),
          });

          // Act
          await repository.save(verification1);
          await repository.save(verification2);

          // Assert
          const saved1 = await repository.findByUserId('user-1');
          const saved2 = await repository.findByUserId('user-2');
          expect(saved1).not.toBeNull();
          expect(saved2).not.toBeNull();
          expect(saved1?.email.toValue()).toBe('user1@example.com');
          expect(saved2?.email.toValue()).toBe('user2@example.com');
        });
      });

      describe('findByToken', () => {
        it('should find verification by token', async () => {
          // Arrange
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
            token: 'unique-token-123',
          });
          await repository.save(verification);

          // Act
          const found = await repository.findByToken('unique-token-123');

          // Assert
          expect(found).not.toBeNull();
          expect(found?.id).toBe(verification.id);
          expect(found?.token).toBe('unique-token-123');
        });

        it('should return null when token not found', async () => {
          // Act
          const found = await repository.findByToken('non-existent-token');

          // Assert
          expect(found).toBeNull();
        });

        it('should find correct verification among multiple', async () => {
          // Arrange
          const verification1 = EmailVerification.create({
            userId: 'user-1',
            email: new Email('user1@example.com'),
            token: 'token-1',
          });
          const verification2 = EmailVerification.create({
            userId: 'user-2',
            email: new Email('user2@example.com'),
            token: 'token-2',
          });
          await repository.save(verification1);
          await repository.save(verification2);

          // Act
          const found = await repository.findByToken('token-2');

          // Assert
          expect(found).not.toBeNull();
          expect(found?.userId).toBe('user-2');
        });
      });

      describe('findByUserId', () => {
        it('should find verification by user id', async () => {
          // Arrange
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
          });
          await repository.save(verification);

          // Act
          const found = await repository.findByUserId('user-123');

          // Assert
          expect(found).not.toBeNull();
          expect(found?.id).toBe(verification.id);
          expect(found?.userId).toBe('user-123');
        });

        it('should return null when user id not found', async () => {
          // Act
          const found = await repository.findByUserId('non-existent-user');

          // Assert
          expect(found).toBeNull();
        });
      });

      describe('findByEmail', () => {
        it('should find verification by email', async () => {
          // Arrange
          const email = new Email('test@example.com');
          const verification = EmailVerification.create({
            userId: 'user-123',
            email,
          });
          await repository.save(verification);

          // Act
          const found = await repository.findByEmail(email);

          // Assert
          expect(found).not.toBeNull();
          expect(found?.email.toValue()).toBe('test@example.com');
        });

        it('should return null when email not found', async () => {
          // Act
          const found = await repository.findByEmail(new Email('non-existent@example.com'));

          // Assert
          expect(found).toBeNull();
        });

        it('should handle emails with special characters', async () => {
          // Arrange
          const email = new Email('test.user+tag@sub-domain.example.com');
          const verification = EmailVerification.create({
            userId: 'user-123',
            email,
          });
          await repository.save(verification);

          // Act
          const found = await repository.findByEmail(email);

          // Assert
          expect(found).not.toBeNull();
          expect(found?.email.toValue()).toBe('test.user+tag@sub-domain.example.com');
        });
      });

      describe('findPendingByUserId', () => {
        it('should find pending verification by user id', async () => {
          // Arrange
          const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
            expiresAt: futureDate,
          });
          await repository.save(verification);

          // Act
          const found = await repository.findPendingByUserId('user-123');

          // Assert
          expect(found).not.toBeNull();
          expect(found?.userId).toBe('user-123');
          expect(found?.isVerified).toBe(false);
        });

        it('should return null for verified verifications', async () => {
          // Arrange
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
          });
          verification.verify();
          await repository.save(verification);

          // Act
          const found = await repository.findPendingByUserId('user-123');

          // Assert
          expect(found).toBeNull();
        });

        it('should return null for expired verifications', async () => {
          // Arrange
          const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
            expiresAt: pastDate,
          });
          await repository.save(verification);

          // Act
          const found = await repository.findPendingByUserId('user-123');

          // Assert
          expect(found).toBeNull();
        });
      });

      describe('findPendingByToken', () => {
        it('should find pending verification by token', async () => {
          // Arrange
          const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
            token: 'pending-token-123',
            expiresAt: futureDate,
          });
          await repository.save(verification);

          // Act
          const found = await repository.findPendingByToken('pending-token-123');

          // Assert
          expect(found).not.toBeNull();
          expect(found?.token).toBe('pending-token-123');
          expect(found?.isVerified).toBe(false);
        });

        it('should return null for verified verifications', async () => {
          // Arrange
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
            token: 'verified-token',
          });
          verification.verify();
          await repository.save(verification);

          // Act
          const found = await repository.findPendingByToken('verified-token');

          // Assert
          expect(found).toBeNull();
        });

        it('should return null for expired verifications', async () => {
          // Arrange
          const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
            token: 'expired-token',
            expiresAt: pastDate,
          });
          await repository.save(verification);

          // Act
          const found = await repository.findPendingByToken('expired-token');

          // Assert
          expect(found).toBeNull();
        });
      });

      describe('remove', () => {
        it('should remove verification by id', async () => {
          // Arrange
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
          });
          await repository.save(verification);

          // Act
          await repository.remove(verification.id);

          // Assert
          const found = await repository.findByUserId('user-123');
          expect(found).toBeNull();
        });

        it('should not throw when removing non-existent id', async () => {
          // Act & Assert
          await expect(repository.remove('non-existent-id')).resolves.not.toThrow();
        });

        it('should only remove specified verification', async () => {
          // Arrange
          const verification1 = EmailVerification.create({
            userId: 'user-1',
            email: new Email('user1@example.com'),
          });
          const verification2 = EmailVerification.create({
            userId: 'user-2',
            email: new Email('user2@example.com'),
          });
          await repository.save(verification1);
          await repository.save(verification2);

          // Act
          await repository.remove(verification1.id);

          // Assert
          const found1 = await repository.findByUserId('user-1');
          const found2 = await repository.findByUserId('user-2');
          expect(found1).toBeNull();
          expect(found2).not.toBeNull();
        });
      });

      describe('exists', () => {
        it('should return true when verification exists', async () => {
          // Arrange
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
          });
          await repository.save(verification);

          // Act
          const exists = await repository.exists(verification.id);

          // Assert
          expect(exists).toBe(true);
        });

        it('should return false when verification does not exist', async () => {
          // Act
          const exists = await repository.exists('non-existent-id');

          // Assert
          expect(exists).toBe(false);
        });

        it('should return false after removing verification', async () => {
          // Arrange
          const verification = EmailVerification.create({
            userId: 'user-123',
            email: new Email('test@example.com'),
          });
          await repository.save(verification);
          await repository.remove(verification.id);

          // Act
          const exists = await repository.exists(verification.id);

          // Assert
          expect(exists).toBe(false);
        });
      });
    });

    describe('Complex Scenarios', () => {
      beforeEach(async () => {
        repository = await createRepository();
      });

      it('should handle verification lifecycle correctly', async () => {
        // Arrange
        const verification = EmailVerification.create({
          userId: 'user-123',
          email: new Email('test@example.com'),
          token: 'test-token',
        });

        // Act & Assert - Initial state
        await repository.save(verification);
        let found = await repository.findPendingByToken('test-token');
        expect(found).not.toBeNull();
        expect(found?.isPending()).toBe(true);

        // Act & Assert - After verification
        verification.verify();
        await repository.save(verification);
        found = await repository.findByToken('test-token');
        expect(found).not.toBeNull();
        expect(found?.isVerified).toBe(true);

        // Pending search should return null
        const pending = await repository.findPendingByToken('test-token');
        expect(pending).toBeNull();
      });

      it('should handle concurrent operations correctly', async () => {
        // Arrange
        const verifications = Array.from({ length: 5 }, (_, i) =>
          EmailVerification.create({
            userId: `user-${i}`,
            email: new Email(`user${i}@example.com`),
            token: `token-${i}`,
          }),
        );

        // Act - Save all concurrently
        await Promise.all(verifications.map((v) => repository.save(v)));

        // Assert - All should be saved
        const foundPromises = verifications.map((v) => repository.findByUserId(v.userId));
        const foundVerifications = await Promise.all(foundPromises);

        foundVerifications.forEach((found, index) => {
          expect(found).not.toBeNull();
          expect(found?.userId).toBe(`user-${index}`);
        });
      });

      it('should maintain data integrity across operations', async () => {
        // Arrange
        const verification = EmailVerification.create({
          userId: 'user-123',
          email: new Email('test@example.com'),
          token: 'integrity-test',
        });

        // Act - Multiple operations
        await repository.save(verification);
        const exists1 = await repository.exists(verification.id);
        const found1 = await repository.findByToken('integrity-test');

        verification.verify();
        await repository.save(verification);
        const found2 = await repository.findByUserId('user-123');

        await repository.remove(verification.id);
        const exists2 = await repository.exists(verification.id);
        const found3 = await repository.findByToken('integrity-test');

        // Assert
        expect(exists1).toBe(true);
        expect(found1).not.toBeNull();
        expect(found2?.isVerified).toBe(true);
        expect(exists2).toBe(false);
        expect(found3).toBeNull();
      });
    });
  });
}