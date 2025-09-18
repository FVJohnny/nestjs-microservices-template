import type { IQuery } from '@nestjs/cqrs';
import { BaseQuery } from '@libs/nestjs-common';

export class GetTokensFromUserCredentials_Query extends BaseQuery implements IQuery {
  public readonly email: string;
  public readonly password: string;

  constructor(props: { email: string; password: string }) {
    super();
    Object.assign(this, props);
  }
}
