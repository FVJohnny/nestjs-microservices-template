import { Injectable } from '@nestjs/common';
import {
  EmailVerification,
  EmailVerificationDTO,
} from '../../../domain/entities/email-verification/email-verification.entity';
import { EmailVerificationRepository } from '../../../domain/repositories/email-verification/email-verification.repository';
import { Email } from '../../../domain/value-objects';
import { AlreadyExistsException, InfrastructureException } from '@libs/nestjs-common';

@Injectable()
export class EmailVerificationInMemoryRepository implements EmailVerificationRepository {
  private emailVerifications: Map<string, EmailVerificationDTO> = new Map();

  constructor(private readonly shouldFail: boolean = false) {}

  async save(emailVerification: EmailVerification): Promise<void> {
    if (this.shouldFail)
      throw new InfrastructureException('save', 'Repository operation failed', new Error());

    // Check if user already has an email verification
    const existingVerificationByUserId = await this.findByUserId(emailVerification.userId);
    if (existingVerificationByUserId && existingVerificationByUserId.id !== emailVerification.id) {
      throw new AlreadyExistsException('userId', emailVerification.userId);
    }

    // Check if email is already used by another verification
    const existingVerificationByEmail = await this.findByEmail(emailVerification.email);
    if (existingVerificationByEmail && existingVerificationByEmail.id !== emailVerification.id) {
      throw new AlreadyExistsException('email', emailVerification.email.toValue());
    }

    this.emailVerifications.set(emailVerification.id, emailVerification.toValue());
  }

  async findByToken(token: string): Promise<EmailVerification | null> {
    if (this.shouldFail)
      throw new InfrastructureException('findByToken', 'Repository operation failed', new Error());

    for (const dto of this.emailVerifications.values()) {
      if (dto.token === token) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async findByUserId(userId: string): Promise<EmailVerification | null> {
    if (this.shouldFail)
      throw new InfrastructureException('findByUserId', 'Repository operation failed', new Error());

    for (const dto of this.emailVerifications.values()) {
      if (dto.userId === userId) {
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

  async findPendingByUserId(userId: string): Promise<EmailVerification | null> {
    if (this.shouldFail)
      throw new InfrastructureException(
        'findPendingByUserId',
        'Repository operation failed',
        new Error(),
      );

    for (const dto of this.emailVerifications.values()) {
      if (dto.userId === userId && !dto.isVerified && new Date(dto.expiresAt) > new Date()) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async findPendingByToken(token: string): Promise<EmailVerification | null> {
    if (this.shouldFail)
      throw new InfrastructureException(
        'findPendingByToken',
        'Repository operation failed',
        new Error(),
      );

    for (const dto of this.emailVerifications.values()) {
      if (dto.token === token && !dto.isVerified && new Date(dto.expiresAt) > new Date()) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async remove(id: string): Promise<void> {
    if (this.shouldFail)
      throw new InfrastructureException('remove', 'Repository operation failed', new Error());

    this.emailVerifications.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    if (this.shouldFail)
      throw new InfrastructureException('exists', 'Repository operation failed', new Error());

    return this.emailVerifications.has(id);
  }
}
