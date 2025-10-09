import type { IQuery } from '@nestjs/cqrs';
import { Base_Query } from '@libs/nestjs-common';

export class GetUserById_Query extends Base_Query implements IQuery {
  public readonly userId: string;

  constructor(props: GetUserById_Query) {
    super();
    Object.assign(this, props);
  }
}
