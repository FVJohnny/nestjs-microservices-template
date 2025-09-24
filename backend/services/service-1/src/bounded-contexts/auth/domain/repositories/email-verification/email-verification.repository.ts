import type { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import type { Email } from '@bc/auth/domain/value-objects';
import type { Id, Repository, RepositoryContext } from '@libs/nestjs-common';

export const EMAIL_VERIFICATION_REPOSITORY = Symbol('EmailVerificationRepository');

export interface EmailVerification_Repository extends Repository<EmailVerification, Id> {
  findByUserId(userId: Id, context?: RepositoryContext): Promise<EmailVerification | null>;
  findByEmail(email: Email, context?: RepositoryContext): Promise<EmailVerification | null>;
  findPendingByUserId(userId: Id, context?: RepositoryContext): Promise<EmailVerification | null>;
}
