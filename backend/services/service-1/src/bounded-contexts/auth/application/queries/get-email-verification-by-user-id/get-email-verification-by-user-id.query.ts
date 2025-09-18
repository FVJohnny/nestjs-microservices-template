import type { IQuery } from '@nestjs/cqrs';
import { BaseQuery } from '@libs/nestjs-common';

export class GetEmailVerificationByUserId_Query extends BaseQuery implements IQuery {
  public readonly userId: string;

  constructor(props: GetEmailVerificationByUserId_Query) {
    super();
    Object.assign(this, props);
  }
}
