import { Inject } from '@nestjs/common';
import { GetUsersCursor_Query } from './get-users-cursor.query';
import { GetUsersCursor_QueryResponse } from './get-users-cursor.query-response';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
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
  Base_QueryHandler,
  PaginationCursor,
} from '@libs/nestjs-common';

export class GetUsersCursor_QueryHandler extends Base_QueryHandler(
  GetUsersCursor_Query,
)<GetUsersCursor_QueryResponse>() {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
  ) {
    super();
  }

  async handle(query: GetUsersCursor_Query): Promise<GetUsersCursor_QueryResponse> {
    const filterList: Filter[] = [];

    // Handle specific id filter
    if (query.userId) {
      const idFilter = new Filter(
        new FilterField('id'),
        FilterOperator.fromValue(Operator.EQUAL),
        new FilterValue(query.userId),
      );
      filterList.push(idFilter);
    }
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

  async authorize(_query: GetUsersCursor_Query) {
    // TODO: Implement authorization logic
    return true;
  }

  async validate(_query: GetUsersCursor_Query) {
    // TODO: Implement validation logic
  }
}
