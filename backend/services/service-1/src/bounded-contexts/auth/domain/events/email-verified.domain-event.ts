import { DomainEvent } from '@libs/nestjs-common';
import type { Id } from '@libs/nestjs-common';
import type { Email } from '@bc/auth/domain/value-objects';

export interface EmailVerificationVerifiedDomainEventProps {
  emailVerificationId: Id;
  userId: Id;
  email: Email;
}

export class EmailVerificationVerified_DomainEvent extends DomainEvent {
  constructor(
    public readonly emailVerificationId: Id,
    public readonly userId: Id,
    public readonly email: Email,
  ) {
    super(emailVerificationId);
  }
}
