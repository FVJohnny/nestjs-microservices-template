import { Injectable } from '@nestjs/common';
import { EmailVerification } from '@bc/auth/domain/entities/email-verification/email-verification.entity';
import { EmailVerificationDTO } from '@bc/auth/domain/entities/email-verification/email-verification.dto';
import { EmailVerificationRepository } from '@bc/auth/domain/repositories/email-verification/email-verification.repository';
import { Email, Expiration, Verification } from '@bc/auth/domain/value-objects';
import { AlreadyExistsException, InfrastructureException, Id } from '@libs/nestjs-common';

@Injectable()
export class EmailVerificationInMemoryRepository implements EmailVerificationRepository {
  private emailVerifications: Map<string, EmailVerificationDTO> = new Map();

  constructor(private readonly shouldFail: boolean = false) {}

  async save(emailVerification: EmailVerification): Promise<void> {
    if (this.shouldFail)
      throw new InfrastructureException('save', 'Repository operation failed', new Error());

    // Check if user already has an email verification
    const existingByUserID = await this.findByUserId(emailVerification.userId);
    if (existingByUserID && !existingByUserID.id.equals(emailVerification.id)) {
      throw new AlreadyExistsException('userId', emailVerification.userId.toValue());
    }

    // Check if email is already used by another verification
    const existingByEmail = await this.findByEmail(emailVerification.email);
    if (existingByEmail && !existingByEmail.id.equals(emailVerification.id)) {
      throw new AlreadyExistsException('email', emailVerification.email.toValue());
    }

    this.emailVerifications.set(emailVerification.id.toValue(), emailVerification.toValue());
  }

  async findById(id: Id): Promise<EmailVerification | null> {
    if (this.shouldFail)
      throw new InfrastructureException('findById', 'Repository operation failed', new Error());

    for (const dto of this.emailVerifications.values()) {
      if (dto.id === id.toValue()) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async findByUserId(userId: Id): Promise<EmailVerification | null> {
    if (this.shouldFail)
      throw new InfrastructureException('findByUserId', 'Repository operation failed', new Error());

    for (const dto of this.emailVerifications.values()) {
      if (dto.userId === userId.toValue()) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async findByEmail(email: Email): Promise<EmailVerification | null> {
    if (this.shouldFail)
      throw new InfrastructureException('findByEmail', 'Repository operation failed', new Error());

    for (const dto of this.emailVerifications.values()) {
      if (dto.email === email.toValue()) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async findPendingByUserId(userId: Id): Promise<EmailVerification | null> {
    if (this.shouldFail)
      throw new InfrastructureException(
        'findPendingByUserId',
        'Repository operation failed',
        new Error(),
      );

    for (const dto of this.emailVerifications.values()) {
      if (dto.userId === userId.toValue() && this.isDtoPending(dto)) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async remove(id: Id): Promise<void> {
    if (this.shouldFail)
      throw new InfrastructureException('remove', 'Repository operation failed', new Error());

    this.emailVerifications.delete(id.toValue());
  }

  async exists(id: Id): Promise<boolean> {
    if (this.shouldFail)
      throw new InfrastructureException('exists', 'Repository operation failed', new Error());

    return this.emailVerifications.has(id.toValue());
  }

  private isDtoPending(dto: EmailVerificationDTO): boolean {
    const verification = new Verification(dto.verification);
    const expiration = new Expiration(dto.expiration);
    return !verification.isVerified() && !expiration.isExpired();
  }
}
