import type { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import type { Email } from '@bc/auth/domain/value-objects';
import type { Id, Repository } from '@libs/nestjs-common';

export const EMAIL_VERIFICATION_REPOSITORY = Symbol('EmailVerificationRepository');

export interface EmailVerificationRepository extends Repository<EmailVerification, Id> {
  findByUserId(userId: Id): Promise<EmailVerification | null>;
  findByEmail(email: Email): Promise<EmailVerification | null>;
  findPendingByUserId(userId: Id): Promise<EmailVerification | null>;
}
