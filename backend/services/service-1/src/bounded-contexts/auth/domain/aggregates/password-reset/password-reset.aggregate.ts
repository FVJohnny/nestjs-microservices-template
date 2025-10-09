import { DateVO, Id, Timestamps } from '@libs/nestjs-common';
import { SharedAggregate, InvalidOperationException } from '@libs/nestjs-common';
import { Email, Expiration, Used } from '@bc/auth/domain/value-objects';
import { PasswordResetRequested_DomainEvent } from './events/password-reset-requested.domain-event';
import type { PasswordResetDTO } from './password-reset.dto';

export interface PasswordResetAttributes {
  id: Id;
  email: Email;
  expiration: Expiration;
  used: Used;
  timestamps: Timestamps;
}

export interface CreatePasswordResetProps {
  email: Email;
}

export class PasswordReset extends SharedAggregate {
  email: Email;
  expiration: Expiration;
  used: Used;

  constructor(props: PasswordResetAttributes) {
    super(props.id, props.timestamps);
    this.email = props.email;
    this.expiration = props.expiration;
    this.used = props.used;
  }

  static create(props: CreatePasswordResetProps): PasswordReset {
    const passwordReset = new PasswordReset({
      id: Id.random(),
      email: props.email,
      expiration: Expiration.atHoursFromNow(1), // Password reset expires in 1 hour
      used: Used.no(),
      timestamps: Timestamps.create(),
    });

    passwordReset.apply(
      new PasswordResetRequested_DomainEvent(
        passwordReset.id,
        passwordReset.email,
        passwordReset.expiration,
      ),
    );

    return passwordReset;
  }

  static random(props?: Partial<PasswordResetAttributes>): PasswordReset {
    return new PasswordReset({
      id: Id.random(),
      email: props?.email || Email.random(),
      expiration: props?.expiration || Expiration.atHoursFromNow(1),
      used: props?.used || Used.no(),
      timestamps: props?.timestamps || Timestamps.create(),
    });
  }

  markAsUsed(): void {
    if (this.isExpired()) {
      throw new InvalidOperationException('markAsUsed', 'expired');
    }
    if (this.isUsed()) {
      throw new InvalidOperationException('markAsUsed', 'already used');
    }

    this.used = Used.yes();
    this.timestamps = new Timestamps(this.timestamps.createdAt, DateVO.now());
  }

  isUsed(): boolean {
    return this.used.isUsed();
  }

  isExpired(): boolean {
    return this.expiration.isExpired();
  }

  isValid(): boolean {
    return !this.isUsed() && !this.isExpired();
  }

  static fromValue(value: PasswordResetDTO): PasswordReset {
    return new PasswordReset({
      id: new Id(value.id),
      email: new Email(value.email),
      expiration: new Expiration(value.expiration),
      used: new Used(value.used),
      timestamps: new Timestamps(new DateVO(value.createdAt), new DateVO(value.updatedAt)),
    });
  }

  toValue(): PasswordResetDTO {
    return {
      ...super.toValue(),

      email: this.email.toValue(),
      expiration: this.expiration.toValue(),
      used: this.used.toValue(),
    };
  }
}
