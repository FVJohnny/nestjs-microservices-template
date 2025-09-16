import { DateVO, Id, Timestamps } from '@libs/nestjs-common';
import { SharedAggregateRoot, InvalidOperationException } from '@libs/nestjs-common';
import { Email, Verification, Expiration } from '@bc/auth/domain/value-objects';
import { EmailVerificationVerified_DomainEvent } from '@bc/auth/domain/events/email-verified.domain-event';
import { EmailVerificationCreated_DomainEvent } from '@bc/auth/domain/events/email-verification-created.domain-event';
import type { EmailVerificationDTO } from './email-verification.dto';

export interface EmailVerificationAttributes {
  id: Id;
  userId: Id;
  email: Email;
  expiration: Expiration;
  verification: Verification;
  timestamps: Timestamps;
}

export interface CreateEmailVerificationProps {
  userId: Id;
  email: Email;
}

export class EmailVerification extends SharedAggregateRoot {
  userId: Id;
  email: Email;
  expiration: Expiration;
  verification: Verification;
  timestamps: Timestamps;

  constructor(props: EmailVerificationAttributes) {
    super(props.id);
    Object.assign(this, props);
  }

  static create(props: CreateEmailVerificationProps): EmailVerification {
    const emailVerification = new EmailVerification({
      id: Id.random(),
      userId: props.userId,
      email: props.email,
      expiration: Expiration.atHoursFromNow(24),
      verification: Verification.notVerified(),
      timestamps: Timestamps.create(),
    });

    emailVerification.apply(
      new EmailVerificationCreated_DomainEvent(
        emailVerification.id,
        emailVerification.userId,
        emailVerification.email,
        emailVerification.expiration,
      ),
    );

    return emailVerification;
  }

  static random(props?: Partial<EmailVerificationAttributes>): EmailVerification {
    return new EmailVerification({
      id: Id.random(),
      userId: props?.userId || Id.random(),
      email: props?.email || Email.random(),
      expiration: props?.expiration || Expiration.atHoursFromNow(24),
      verification: props?.verification || Verification.notVerified(),
      timestamps: props?.timestamps || Timestamps.create(),
    });
  }

  verify(): void {
    if (this.isExpired()) {
      throw new InvalidOperationException('verify', 'expired');
    }
    if (this.isVerified()) {
      throw new InvalidOperationException('verify', 'verified');
    }

    this.verification = Verification.verified();
    this.timestamps.update();

    this.apply(new EmailVerificationVerified_DomainEvent(this.id, this.userId, this.email));
  }

  isVerified(): boolean {
    return this.verification.isVerified();
  }

  isExpired(): boolean {
    return this.expiration.isExpired();
  }

  isPending(): boolean {
    return !this.isVerified() && !this.isExpired();
  }

  static fromValue(value: EmailVerificationDTO): EmailVerification {
    return new EmailVerification({
      id: new Id(value.id),
      userId: new Id(value.userId),
      email: new Email(value.email),
      expiration: new Expiration(value.expiration),
      verification: new Verification(value.verification),
      timestamps: new Timestamps(new DateVO(value.createdAt), new DateVO(value.updatedAt)),
    });
  }

  toValue(): EmailVerificationDTO {
    return {
      id: this.id.toValue(),
      userId: this.userId.toValue(),
      email: this.email.toValue(),
      expiration: this.expiration.toValue(),
      verification: this.verification.toValue(),
      createdAt: this.timestamps.createdAt.toValue(),
      updatedAt: this.timestamps.updatedAt.toValue(),
    };
  }
}
