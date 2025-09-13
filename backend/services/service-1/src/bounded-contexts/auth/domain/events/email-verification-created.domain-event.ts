import type { Id } from '@libs/nestjs-common';
import { DomainEvent } from '@libs/nestjs-common';
import type { Email } from '../value-objects';

export class EmailVerificationCreatedDomainEvent extends DomainEvent {
  constructor(
    public readonly emailVerificationId: Id,
    public readonly userId: Id,
    public readonly email: Email,
    public readonly token: Id,
    public readonly expiresAt: Date,
  ) {
    super(emailVerificationId);
  }
}
