import { Injectable } from '@nestjs/common';
import {
  EmailVerification,
  EmailVerificationDTO,
} from '../../../domain/entities/email-verification/email-verification.entity';
import { EmailVerificationRepository } from '../../../domain/repositories/email-verification/email-verification.repository';
import { Email } from '../../../domain/value-objects/email.vo';
import { AlreadyExistsException } from '@libs/nestjs-common';

@Injectable()
export class EmailVerificationInMemoryRepository implements EmailVerificationRepository {
  private emailVerifications: Map<string, EmailVerificationDTO> = new Map();

  async save(emailVerification: EmailVerification): Promise<void> {
    // Check if user already has an email verification
    const existingVerification = await this.findByUserId(emailVerification.userId);
    if (existingVerification && existingVerification.id !== emailVerification.id) {
      throw new AlreadyExistsException('userId', emailVerification.userId);
    }
    this.emailVerifications.set(emailVerification.id, emailVerification.toValue());
  }

  async findByToken(token: string): Promise<EmailVerification | null> {
    for (const dto of this.emailVerifications.values()) {
      if (dto.token === token) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async findByUserId(userId: string): Promise<EmailVerification | null> {
    for (const dto of this.emailVerifications.values()) {
      if (dto.userId === userId) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async findByEmail(email: Email): Promise<EmailVerification | null> {
    for (const dto of this.emailVerifications.values()) {
      if (dto.email === email.toValue()) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async findPendingByUserId(userId: string): Promise<EmailVerification | null> {
    for (const dto of this.emailVerifications.values()) {
      if (dto.userId === userId && !dto.isVerified && new Date(dto.expiresAt) > new Date()) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async findPendingByToken(token: string): Promise<EmailVerification | null> {
    for (const dto of this.emailVerifications.values()) {
      if (dto.token === token && !dto.isVerified && new Date(dto.expiresAt) > new Date()) {
        return EmailVerification.fromValue(dto);
      }
    }
    return null;
  }

  async remove(id: string): Promise<void> {
    this.emailVerifications.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.emailVerifications.has(id);
  }
}
