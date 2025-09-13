import { DomainEvent } from '@libs/nestjs-common';
import type { Id } from '@libs/nestjs-common';
import type { Email } from '../value-objects';

export interface EmailVerificationVerifiedDomainEventProps {
  emailVerificationId: Id;
  userId: Id;
  email: Email;
}

export class EmailVerificationVerifiedDomainEvent extends DomainEvent {
  constructor(
    public readonly emailVerificationId: Id,
    public readonly userId: Id,
    public readonly email: Email,
  ) {
    super(emailVerificationId);
  }
}
