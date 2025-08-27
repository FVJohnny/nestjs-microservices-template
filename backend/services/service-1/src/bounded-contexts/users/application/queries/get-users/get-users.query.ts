import { IQuery } from '@nestjs/cqrs';

export class GetUsersQuery implements IQuery {
  constructor(
    public readonly status?: string,
    public readonly roles?: string[],
    public readonly email?: string,
    public readonly username?: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly orderBy?: string,
    public readonly orderType?: string,
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly onlyActive?: boolean,
  ) {}
}