import { Id, SharedAggregateRootDTO } from '@libs/nestjs-common';
import { Email, Expiration, Verification } from '@bc/auth/domain/value-objects';

export class EmailVerificationDTO extends SharedAggregateRootDTO {
  userId: string;
  email: string;
  expiration: Date;
  verification: Date;

  static random(): EmailVerificationDTO {
    return {
      ...SharedAggregateRootDTO.random(),

      userId: Id.random().toValue(),
      email: Email.random().toValue(),
      expiration: Expiration.atHoursFromNow(24).toValue(),
      verification: Verification.notVerified().toValue(),
    };
  }
}
