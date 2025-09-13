import { type SharedAggregateRootDTO, Id } from '@libs/nestjs-common';
import { SharedAggregateRoot, InvalidOperationException } from '@libs/nestjs-common';
import { Email } from '../../value-objects';
import { EmailVerificationVerifiedDomainEvent } from '../../events/email-verified.domain-event';
import { EmailVerificationCreatedDomainEvent } from '../../events/email-verification-created.domain-event';

export interface EmailVerificationAttributes {
  id: Id;
  userId: Id;
  email: Email;
  token: Id;
  expiresAt: Date;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailVerificationProps {
  userId: Id;
  email: Email;
}

export interface EmailVerificationDTO extends SharedAggregateRootDTO {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailVerification extends SharedAggregateRoot {
  userId: Id;
  email: Email;
  token: Id;
  expiresAt: Date;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: EmailVerificationAttributes) {
    super(props.id);
    Object.assign(this, props);
  }

  static create(props: CreateEmailVerificationProps): EmailVerification {
    const emailVerification = new EmailVerification({
      id: Id.random(),
      userId: props.userId,
      email: props.email,
      token: Id.random(),
      expiresAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
      verifiedAt: new Date(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    emailVerification.apply(
      new EmailVerificationCreatedDomainEvent(
        emailVerification.id,
        emailVerification.userId,
        emailVerification.email,
        emailVerification.token,
        emailVerification.expiresAt,
      ),
    );

    return emailVerification;
  }

  static random(props?: Partial<EmailVerificationAttributes>): EmailVerification {
    return new EmailVerification({
      id: Id.random(),
      userId: props?.userId || Id.random(),
      email: props?.email || Email.random(),
      token: props?.token || Id.random(),
      expiresAt: props?.expiresAt || new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
      verifiedAt: props?.verifiedAt || new Date(0),
      createdAt: props?.createdAt || new Date(),
      updatedAt: props?.updatedAt || new Date(),
    });
  }

  verify(): void {
    if (this.isExpired()) {
      throw new InvalidOperationException('verify', 'expired');
    }
    if (this.isVerified()) {
      throw new InvalidOperationException('verify', 'verified');
    }

    this.verifiedAt = new Date();
    this.updatedAt = new Date();

    this.apply(
      new EmailVerificationVerifiedDomainEvent({
        emailVerificationId: this.id,
        userId: this.userId,
        email: this.email,
      }),
    );
  }

  isVerified(): boolean {
    return this.verifiedAt && this.verifiedAt.getTime() > 0;
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return (!this.verifiedAt || this.verifiedAt.getTime() === 0) && !this.isExpired();
  }

  static fromValue(value: EmailVerificationDTO): EmailVerification {
    return new EmailVerification({
      id: new Id(value.id),
      userId: new Id(value.userId),
      email: new Email(value.email),
      token: new Id(value.token),
      expiresAt: new Date(value.expiresAt),
      verifiedAt: value.verifiedAt ? new Date(value.verifiedAt) : new Date(0),
      createdAt: new Date(value.createdAt),
      updatedAt: new Date(value.updatedAt),
    });
  }

  toValue(): EmailVerificationDTO {
    return {
      id: this.id.toValue(),
      userId: this.userId.toValue(),
      email: this.email.toValue(),
      token: this.token.toValue(),
      expiresAt: this.expiresAt,
      verifiedAt: this.verifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
