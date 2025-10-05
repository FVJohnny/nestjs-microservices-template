import { SharedAggregateRootDTO } from '@libs/nestjs-common';
import { Email, Expiration, Used } from '@bc/auth/domain/value-objects';

export class PasswordResetDTO extends SharedAggregateRootDTO {
  email: string;
  expiration: Date;
  used: boolean;

  static random(): PasswordResetDTO {
    return {
      ...SharedAggregateRootDTO.random(),

      email: Email.random().toValue(),
      expiration: Expiration.atHoursFromNow(1).toValue(),
      used: Used.no().toValue(),
    };
  }
}
