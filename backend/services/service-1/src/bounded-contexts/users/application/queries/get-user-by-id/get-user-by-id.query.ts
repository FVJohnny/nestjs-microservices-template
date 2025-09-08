import type { IQuery } from '@nestjs/cqrs';
import type { TracingMetadata } from '@libs/nestjs-common';
import { BaseQuery } from '@libs/nestjs-common';

export class GetUserByIdQuery extends BaseQuery implements IQuery {
  public readonly userId: string;

  constructor(props: GetUserByIdQuery, metadata?: TracingMetadata) {
    super(metadata);
    Object.assign(this, props);
  }
}
