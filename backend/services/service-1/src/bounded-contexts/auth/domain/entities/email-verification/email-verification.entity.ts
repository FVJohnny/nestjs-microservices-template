import { v4 as uuidv4 } from 'uuid';
import type { SharedAggregateRootDTO } from '@libs/nestjs-common';
import { SharedAggregateRoot, InvalidOperationException } from '@libs/nestjs-common';
import { Email } from '../../value-objects';
import { EmailVerifiedDomainEvent } from '../../events/email-verified.domain-event';
import { EmailVerificationCreatedDomainEvent } from '../../events/email-verification-created.domain-event';

export interface EmailVerificationAttributes {
  id: string;
  userId: string;
  email: Email;
  token: string;
  expiresAt: Date;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailVerificationProps {
  userId: string;
  email: Email;
  token?: string;
  expiresAt?: Date;
}

export interface EmailVerificationDTO extends SharedAggregateRootDTO {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailVerification extends SharedAggregateRoot implements EmailVerificationAttributes {
  userId: string;
  email: Email;
  token: string;
  expiresAt: Date;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: EmailVerificationAttributes) {
    super(props.id);
    Object.assign(this, props);
  }

  static create(props: CreateEmailVerificationProps): EmailVerification {
    const id = uuidv4();
    const now = new Date();
    const token = props.token || uuidv4().replace(/-/g, '');
    const expiresAt = props.expiresAt || new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const emailVerification = new EmailVerification({
      id,
      userId: props.userId,
      email: props.email,
      token,
      expiresAt,
      isVerified: false,
      verifiedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    emailVerification.apply(
      new EmailVerificationCreatedDomainEvent(
        id,
        props.userId,
        props.email.toValue(),
        token,
        expiresAt,
      ),
    );

    return emailVerification;
  }

  verify(): void {
    if (this.isVerified) {
      throw new InvalidOperationException('verify', 'verified');
    }

    if (this.isExpired()) {
      throw new InvalidOperationException('verify', 'expired');
    }

    this.isVerified = true;
    this.verifiedAt = new Date();
    this.updatedAt = new Date();

    this.apply(
      new EmailVerifiedDomainEvent({
        emailVerificationId: this.id,
        userId: this.userId,
        email: this.email.toValue(),
      }),
    );
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return !this.isVerified && !this.isExpired();
  }

  static fromValue(value: EmailVerificationDTO): EmailVerification {
    return new EmailVerification({
      id: value.id,
      userId: value.userId,
      email: new Email(value.email),
      token: value.token,
      expiresAt: new Date(value.expiresAt),
      isVerified: value.isVerified,
      verifiedAt: value.verifiedAt ? new Date(value.verifiedAt) : undefined,
      createdAt: new Date(value.createdAt),
      updatedAt: new Date(value.updatedAt),
    });
  }

  toValue(): EmailVerificationDTO {
    return {
      id: this.id,
      userId: this.userId,
      email: this.email.toValue(),
      token: this.token,
      expiresAt: this.expiresAt,
      isVerified: this.isVerified,
      verifiedAt: this.verifiedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
