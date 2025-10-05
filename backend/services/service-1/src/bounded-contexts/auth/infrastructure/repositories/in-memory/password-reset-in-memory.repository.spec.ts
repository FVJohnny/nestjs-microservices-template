import { PasswordReset_InMemory_Repository } from './password-reset-in-memory.repository';
import { testPasswordResetRepositoryContract } from '@bc/auth/domain/repositories/password-reset/password-reset.repository.spec';
import type { PasswordReset } from '@bc/auth/domain/entities/password-reset/password-reset.entity';

// Run the shared contract tests for in-memory implementation
testPasswordResetRepositoryContract(
  'In-Memory Implementation',
  async (passwordResets?: PasswordReset[]) => {
    const repository = new PasswordReset_InMemory_Repository();
    passwordResets?.forEach((passwordReset) => repository.save(passwordReset));
    return repository;
  },
);
