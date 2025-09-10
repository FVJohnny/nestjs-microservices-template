import { DomainEvent } from '@libs/nestjs-common';

export interface EmailVerifiedDomainEventProps {
  emailVerificationId: string;
  userId: string;
  email: string;
}

export class EmailVerifiedDomainEvent extends DomainEvent {
  public readonly userId: string;
  public readonly email: string;

  constructor(props: EmailVerifiedDomainEventProps) {
    super(props.emailVerificationId);
    this.userId = props.userId;
    this.email = props.email;
  }
}
