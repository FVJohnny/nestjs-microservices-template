import { type SharedAggregateRootDTO, Id, DateVO } from '@libs/nestjs-common';
import { SharedAggregateRoot, InvalidOperationException } from '@libs/nestjs-common';
import { Email, Verification, Expiration } from '../../value-objects';
import { EmailVerificationVerifiedDomainEvent } from '../../events/email-verified.domain-event';
import { EmailVerificationCreatedDomainEvent } from '../../events/email-verification-created.domain-event';

export interface EmailVerificationAttributes {
  id: Id;
  userId: Id;
  email: Email;
  token: Id;
  expiration: Expiration;
  verification: Verification;
  createdAt: DateVO;
  updatedAt: DateVO;
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
  expiration: Date;
  verification: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailVerification extends SharedAggregateRoot {
  userId: Id;
  email: Email;
  token: Id;
  expiration: Expiration;
  verification: Verification;
  createdAt: DateVO;
  updatedAt: DateVO;

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
      expiration: Expiration.atHoursFromNow(24),
      verification: Verification.notVerified(),
      createdAt: new DateVO(new Date()),
      updatedAt: new DateVO(new Date()),
    });

    emailVerification.apply(
      new EmailVerificationCreatedDomainEvent(
        emailVerification.id,
        emailVerification.userId,
        emailVerification.email,
        emailVerification.token,
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
      token: props?.token || Id.random(),
      expiration: props?.expiration || Expiration.atHoursFromNow(24),
      verification: props?.verification || Verification.notVerified(),
      createdAt: props?.createdAt || new DateVO(new Date()),
      updatedAt: props?.updatedAt || new DateVO(new Date()),
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
    this.updatedAt = new DateVO(new Date());

    this.apply(
      new EmailVerificationVerifiedDomainEvent({
        emailVerificationId: this.id,
        userId: this.userId,
        email: this.email,
      }),
    );
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
      token: new Id(value.token),
      expiration: new Expiration(value.expiration),
      verification: new Verification(value.verification),
      createdAt: new DateVO(value.createdAt),
      updatedAt: new DateVO(value.updatedAt),
    });
  }

  toValue(): EmailVerificationDTO {
    return {
      id: this.id.toValue(),
      userId: this.userId.toValue(),
      email: this.email.toValue(),
      token: this.token.toValue(),
      expiration: this.expiration.toValue(),
      verification: this.verification.toValue(),
      createdAt: this.createdAt.toValue(),
      updatedAt: this.updatedAt.toValue(),
    };
  }
}
