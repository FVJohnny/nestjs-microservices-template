import { Id, SharedAggregateRootDTO, Timestamps } from '@libs/nestjs-common';
import { Email, Expiration, Verification } from '@bc/auth/domain/value-objects';

export class EmailVerificationDTO extends SharedAggregateRootDTO {
  userId: string;
  email: string;
  expiration: Date;
  verification: Date;
  createdAt: Date;
  updatedAt: Date;

  static random(): EmailVerificationDTO {
    return {
      id: Id.random().toValue(),
      userId: Id.random().toValue(),
      email: Email.random().toValue(),
      expiration: Expiration.atHoursFromNow(24).toValue(),
      verification: Verification.notVerified().toValue(),
      createdAt: Timestamps.random().createdAt.toValue(),
      updatedAt: Timestamps.random().updatedAt.toValue(),
    };
  }
}
