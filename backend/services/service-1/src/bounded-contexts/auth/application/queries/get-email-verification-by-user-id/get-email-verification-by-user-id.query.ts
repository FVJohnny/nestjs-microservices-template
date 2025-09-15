import type { IQuery } from '@nestjs/cqrs';
import type { TracingMetadata } from '@libs/nestjs-common';
import { BaseQuery } from '@libs/nestjs-common';

export class GetEmailVerificationByUserIdQuery extends BaseQuery implements IQuery {
  public readonly userId: string;

  constructor(props: GetEmailVerificationByUserIdQuery, metadata?: TracingMetadata) {
    super(metadata);
    Object.assign(this, props);
  }
}
