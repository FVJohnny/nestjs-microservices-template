import { IQuery } from '@nestjs/cqrs';

export class GetChannelsQuery implements IQuery {
  constructor(public readonly userId?: string) {}
}
