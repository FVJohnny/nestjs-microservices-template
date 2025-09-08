import { QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUsersCursorQuery } from './get-users-cursor.query';
import { GetUsersCursorQueryResponse } from './get-users-cursor.response';
import { USER_REPOSITORY, type UserRepository } from '../../../domain/repositories/user.repository';
import {
  Criteria,
  Filters,
  Filter,
  FilterField,
  FilterOperator,
  FilterValue,
  Operator,
  OrderTypes,
  Order,
  BaseQueryHandler,
  PaginationCursor,
} from '@libs/nestjs-common';

@QueryHandler(GetUsersCursorQuery)
export class GetUsersCursorQueryHandler extends BaseQueryHandler<
  GetUsersCursorQuery,
  GetUsersCursorQueryResponse
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {
    super();
  }

  protected async handle(query: GetUsersCursorQuery): Promise<GetUsersCursorQueryResponse> {
    const filterList: Filter[] = [];

    // Handle specific status filter
    if (query.status) {
      const statusFilter = new Filter(
        new FilterField('status'),
        FilterOperator.fromValue(Operator.EQUAL),
        new FilterValue(query.status),
      );
      filterList.push(statusFilter);
    }

    // Handle role filter (single value equality)
    if (query.role) {
      const roleFilter = new Filter(
        new FilterField('role'),
        FilterOperator.fromValue(Operator.EQUAL),
        new FilterValue(query.role),
      );
      filterList.push(roleFilter);
    }

    // Handle email filter (partial match)
    if (query.email) {
      const emailFilter = new Filter(
        new FilterField('email'),
        FilterOperator.fromValue(Operator.CONTAINS),
        new FilterValue(query.email),
      );
      filterList.push(emailFilter);
    }

    // Handle username filter (partial match)
    if (query.username) {
      const usernameFilter = new Filter(
        new FilterField('username'),
        FilterOperator.fromValue(Operator.CONTAINS),
        new FilterValue(query.username),
      );
      filterList.push(usernameFilter);
    }

    // Handle firstName filter (partial match)
    if (query.firstName) {
      const firstNameFilter = new Filter(
        new FilterField('profile.firstName'),
        FilterOperator.fromValue(Operator.CONTAINS),
        new FilterValue(query.firstName),
      );
      filterList.push(firstNameFilter);
    }

    // Handle lastName filter (partial match)
    if (query.lastName) {
      const lastNameFilter = new Filter(
        new FilterField('profile.lastName'),
        FilterOperator.fromValue(Operator.CONTAINS),
        new FilterValue(query.lastName),
      );
      filterList.push(lastNameFilter);
    }

    const filters = new Filters(filterList);

    const sort = query.pagination?.sort;
    const order = sort
      ? Order.fromValues(sort.field, sort.order || OrderTypes.ASC)
      : Order.fromValues('id', OrderTypes.ASC); // Default sort by id for cursor pagination

    const pagination = new PaginationCursor({
      limit: query.pagination?.limit,
      cursor: query.pagination?.cursor,
    });

    const criteria = new Criteria({
      filters,
      order,
      pagination,
    });

    const result = await this.userRepository.findByCriteria(criteria);

    return {
      data: result.data.map((user) => user.toValue()),
      pagination: {
        hasNext: result.hasNext ?? false,
        cursor: result.cursor,
      },
    };
  }

  protected authorize(_query: GetUsersCursorQuery): Promise<boolean> {
    // TODO: Implement authorization logic
    return Promise.resolve(true);
  }

  protected validate(_query: GetUsersCursorQuery): Promise<void> {
    // TODO: Implement validation logic
    // For example: validate limit ranges, cursor format, orderBy field names, etc.
    return Promise.resolve();
  }
}
