import { IQuery } from '@nestjs/cqrs';

export class GetUserByIdQuery implements IQuery {

  public readonly userId: string;

  constructor(
    props: GetUserByIdQuery
  ) {
    Object.assign(this, props);
  }
}