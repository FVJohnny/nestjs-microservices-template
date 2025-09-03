import { IQuery } from '@nestjs/cqrs';
import { OffsetPageParams, TracingMetadata } from '@libs/nestjs-common';
import { BaseQuery } from '@libs/nestjs-common';

export class GetUsersQuery extends BaseQuery implements IQuery {
  public readonly status?: string;
  public readonly role?: string;
  public readonly email?: string;
  public readonly username?: string;
  public readonly firstName?: string;
  public readonly lastName?: string;

  // pagination
  public readonly pagination?: OffsetPageParams;

  constructor(props: GetUsersQuery, metadata?: TracingMetadata) {
    super(metadata);
    Object.assign(this, props);
  }
}
