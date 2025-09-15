import type { IQuery } from '@nestjs/cqrs';
import type { TracingMetadata } from '@libs/nestjs-common';
import { BaseQuery } from '@libs/nestjs-common';

export class GetTokensFromUserCredentialsQuery extends BaseQuery implements IQuery {
  public readonly email: string;
  public readonly password: string;

  constructor(props: { email: string; password: string }, metadata?: TracingMetadata) {
    super(metadata);
    Object.assign(this, props);
  }
}
