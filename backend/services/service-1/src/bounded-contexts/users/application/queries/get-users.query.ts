import { IQuery } from '@nestjs/cqrs';

export class GetUsersQuery implements IQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly onlyActive?: boolean,
  ) {}
}