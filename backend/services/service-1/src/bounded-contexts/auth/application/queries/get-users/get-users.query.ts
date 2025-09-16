import type { IQuery } from '@nestjs/cqrs';
import type { PaginationOffsetParams, TracingMetadata } from '@libs/nestjs-common';
import { BaseQuery } from '@libs/nestjs-common';

export class GetUsers_Query extends BaseQuery implements IQuery {
  public readonly userId?: string;
  public readonly status?: string;
  public readonly role?: string;
  public readonly email?: string;
  public readonly username?: string;

  // pagination
  public readonly pagination?: PaginationOffsetParams;

  constructor(props: GetUsers_Query, metadata?: TracingMetadata) {
    super(metadata);
    Object.assign(this, props);
  }
}
