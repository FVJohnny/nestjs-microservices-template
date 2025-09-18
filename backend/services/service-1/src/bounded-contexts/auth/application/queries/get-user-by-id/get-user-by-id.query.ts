import type { IQuery } from '@nestjs/cqrs';
import { BaseQuery } from '@libs/nestjs-common';

export class GetUserById_Query extends BaseQuery implements IQuery {
  public readonly userId: string;

  constructor(props: GetUserById_Query) {
    super();
    Object.assign(this, props);
  }
}
