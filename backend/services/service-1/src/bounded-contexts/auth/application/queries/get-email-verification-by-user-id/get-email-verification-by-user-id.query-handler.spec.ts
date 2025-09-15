import { GetEmailVerificationByUserIdQueryHandler } from './get-email-verification-by-user-id.query-handler';
import { GetEmailVerificationByUserIdQuery } from './get-email-verification-by-user-id.query';
import { EmailVerificationInMemoryRepository } from '@bc/auth/infrastructure/repositories/in-memory/email-verification-in-memory.repository';
import { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import { Email } from '@bc/auth/domain/value-objects';
import { NotFoundException, InfrastructureException, Id } from '@libs/nestjs-common';

describe('GetEmailVerificationByUserIdQueryHandler', () => {
  // Test data factory
  const createQuery = (overrides: Partial<GetEmailVerificationByUserIdQuery> = {}) =>
    new GetEmailVerificationByUserIdQuery({
      userId: Id.random().toValue(),
      ...overrides,
    });

  // Setup factory
  const setup = (params: { shouldFailRepository?: boolean } = {}) => {
    const { shouldFailRepository = false } = params;

    const repository = new EmailVerificationInMemoryRepository(shouldFailRepository);
    const handler = new GetEmailVerificationByUserIdQueryHandler(repository);

    return { repository, handler };
  };

  it('should return the email verification DTO when email verification exists', async () => {
    // Arrange
    const { handler, repository } = setup();
    const emailVerification = EmailVerification.random();
    await repository.save(emailVerification);

    const query = createQuery({ userId: emailVerification.userId.toValue() });

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result).toBeDefined();
    expect(result).toEqual(emailVerification.toValue());
  });

  it('should throw NotFoundException when email verification does not exist', async () => {
    // Arrange
    const { handler } = setup();
    const query = createQuery();

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should throw InfrastructureException if repository fails', async () => {
    // Arrange
    const { handler } = setup({ shouldFailRepository: true });
    const query = createQuery();

    // Act & Assert
    await expect(handler.execute(query)).rejects.toThrow(InfrastructureException);
  });

  it('should return the correct email verification for a specific user ID', async () => {
    // Arrange
    const { handler, repository } = setup();
    
    // Create multiple email verifications
    const emailVerification1 = EmailVerification.random();
    const emailVerification2 = EmailVerification.random();
    const emailVerification3 = EmailVerification.random();
    
    await repository.save(emailVerification1);
    await repository.save(emailVerification2);
    await repository.save(emailVerification3);

    const query = createQuery({ userId: emailVerification2.userId.toValue() });

    // Act
    const result = await handler.execute(query);

    // Assert
    expect(result).toBeDefined();
    expect(result).toEqual(emailVerification2.toValue());
  });
});