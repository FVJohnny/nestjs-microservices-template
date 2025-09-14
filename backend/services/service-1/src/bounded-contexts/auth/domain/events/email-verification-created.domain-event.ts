import type { Id } from '@libs/nestjs-common';
import { DomainEvent } from '@libs/nestjs-common';
import type { Email, Expiration } from '@bc/auth/domain/value-objects';

export class EmailVerificationCreatedDomainEvent extends DomainEvent {
  constructor(
    public readonly emailVerificationId: Id,
    public readonly userId: Id,
    public readonly email: Email,
    public readonly expiration: Expiration,
  ) {
    super(emailVerificationId);
  }
}
