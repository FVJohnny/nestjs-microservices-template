import { IQuery } from '@nestjs/cqrs';
import { TracingMetadata } from '@libs/nestjs-common';
import { BaseQuery } from '@libs/nestjs-common';

export class GetUsersQuery extends BaseQuery implements IQuery {

  public readonly status?: string;
  public readonly roles?: string[];
  public readonly email?: string;
  public readonly username?: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly orderBy?: string;
  public readonly orderType?: string;
  public readonly limit?: number;
  public readonly offset?: number;
  public readonly onlyActive?: boolean;

  constructor(
    props: GetUsersQuery,
    metadata?: TracingMetadata
  ) {
    super(metadata);
    Object.assign(this, props);
  }
}