import { EmailVerification_InMemoryRepository } from './email-verification.in-memory-repository';
import { testEmailVerificationRepositoryContract } from '@bc/auth/domain/repositories/email-verification/email-verification.repository.spec';
import type { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';

// Run the shared contract tests for in-memory implementation
testEmailVerificationRepositoryContract(
  'In-Memory Implementation',
  async (verifications?: EmailVerification[]) => {
    const repository = new EmailVerification_InMemoryRepository();
    verifications?.forEach((verification) => repository.save(verification));
    return repository;
  },
);
