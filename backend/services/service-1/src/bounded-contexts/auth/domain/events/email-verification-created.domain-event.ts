import { DomainEvent } from '@libs/nestjs-common';

export class EmailVerificationCreatedDomainEvent extends DomainEvent {
  constructor(
    public readonly emailVerificationId: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly token: string,
    public readonly expiresAt: Date,
  ) {
    super(emailVerificationId);
  }
}
