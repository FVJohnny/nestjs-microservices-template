import type { PasswordReset } from '@bc/auth/domain/entities/password-reset/password-reset.entity';
import type { Email } from '@bc/auth/domain/value-objects';
import type { Id, Repository } from '@libs/nestjs-common';

export const PASSWORD_RESET_REPOSITORY = Symbol('PasswordResetRepository');

export interface PasswordReset_Repository extends Repository<PasswordReset, Id> {
  findByEmail(email: Email): Promise<PasswordReset | null>;
  findValidByEmail(email: Email): Promise<PasswordReset | null>;
}
