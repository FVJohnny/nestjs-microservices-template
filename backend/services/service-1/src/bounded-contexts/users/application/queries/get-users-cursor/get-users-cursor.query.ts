import type { IQuery } from '@nestjs/cqrs';
import type {
  TracingMetadata,
  PaginationCursorParams,
} from '@libs/nestjs-common';
import { BaseQuery } from '@libs/nestjs-common';

export class GetUsersCursorQuery extends BaseQuery implements IQuery {
  public readonly status?: string;
  public readonly role?: string;
  public readonly email?: string;
  public readonly username?: string;
  public readonly firstName?: string;
  public readonly lastName?: string;

  // cursor pagination
  public readonly pagination?: PaginationCursorParams;

  constructor(props: GetUsersCursorQuery, metadata?: TracingMetadata) {
    super(metadata);
    Object.assign(this, props);
  }
}
