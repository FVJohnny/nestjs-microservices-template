import type { EmailVerification } from '../../entities/email-verification/email-verification.entity';
import type { Email } from '../../value-objects/email.vo';

export const EMAIL_VERIFICATION_REPOSITORY = Symbol('EmailVerificationRepository');

export interface EmailVerificationRepository {
  save(emailVerification: EmailVerification): Promise<void>;
  findByToken(token: string): Promise<EmailVerification | null>;
  findByUserId(userId: string): Promise<EmailVerification[]>;
  findByEmail(email: Email): Promise<EmailVerification[]>;
  findPendingByUserId(userId: string): Promise<EmailVerification | null>;
  findPendingByToken(token: string): Promise<EmailVerification | null>;
  remove(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
