import { DomainEvent } from '@libs/nestjs-common';

export interface EmailVerificationVerifiedDomainEventProps {
  emailVerificationId: string;
  userId: string;
  email: string;
}

export class EmailVerificationVerifiedDomainEvent extends DomainEvent {
  public readonly userId: string;
  public readonly email: string;

  constructor(props: EmailVerificationVerifiedDomainEventProps) {
    super(props.emailVerificationId);
    this.userId = props.userId;
    this.email = props.email;
  }
}
