import { EmailVerificationInMemoryRepository } from './email-verification-in-memory.repository';
import { testEmailVerificationRepositoryContract } from '../../../domain/repositories/email-verification/email-verification.repository.spec';
import type { EmailVerification } from '../../../domain/entities/email-verification/email-verification.entity';

// Run the shared contract tests for in-memory implementation
testEmailVerificationRepositoryContract(
  'In-Memory Implementation',
  async (verifications?: EmailVerification[]) => {
    const repository = new EmailVerificationInMemoryRepository();
    verifications?.forEach((verification) => repository.save(verification));
    return repository;
  },
);