import type { IQuery } from '@nestjs/cqrs';
import type { PaginationCursorParams } from '@libs/nestjs-common';
import { BaseQuery } from '@libs/nestjs-common';

export class GetUsersCursor_Query extends BaseQuery implements IQuery {
  public readonly userId?: string;
  public readonly status?: string;
  public readonly role?: string;
  public readonly email?: string;
  public readonly username?: string;

  // cursor pagination
  public readonly pagination?: PaginationCursorParams;

  constructor(props: GetUsersCursor_Query) {
    super();
    Object.assign(this, props);
  }
}
