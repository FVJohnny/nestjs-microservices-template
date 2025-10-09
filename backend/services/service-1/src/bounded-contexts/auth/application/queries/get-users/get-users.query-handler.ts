import { Inject } from '@nestjs/common';
import { GetUsers_Query } from './get-users.query';
import { GetUsers_QueryResponse } from './get-users.query-response';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/aggregates/user/user.repository';
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
  PaginationOffset,
} from '@libs/nestjs-common';

export class GetUsers_QueryHandler extends Base_QueryHandler(
  GetUsers_Query,
)<GetUsers_QueryResponse>() {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: User_Repository) {
    super();
  }

  async handle(query: GetUsers_Query): Promise<GetUsers_QueryResponse> {
    const filterList: Filter[] = [];
    // Handle specific id filter
    if (query.userId) {
      const idFilter = new Filter(
        new FilterField('id'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue(query.userId),
      );
      filterList.push(idFilter);
    }
    // Handle specific status filter
    if (query.status) {
      const statusFilter = new Filter(
        new FilterField('status'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue(query.status),
      );
      filterList.push(statusFilter);
    }

    // Handle role filter (single value equality)
    if (query.role) {
      const roleFilter = new Filter(
        new FilterField('role'),
        new FilterOperator(Operator.EQUAL),
        new FilterValue(query.role),
      );
      filterList.push(roleFilter);
    }

    // Handle email filter (partial match)
    if (query.email) {
      const emailFilter = new Filter(
        new FilterField('email'),
        new FilterOperator(Operator.CONTAINS),
        new FilterValue(query.email),
      );
      filterList.push(emailFilter);
    }

    // Handle username filter (partial match)
    if (query.username) {
      const usernameFilter = new Filter(
        new FilterField('username'),
        new FilterOperator(Operator.CONTAINS),
        new FilterValue(query.username),
      );
      filterList.push(usernameFilter);
    }

    const filters = new Filters(filterList);

    let order = Order.none();
    if (query.pagination?.sort) {
      order = Order.fromValues(
        query.pagination.sort.field,
        query.pagination.sort.order || OrderTypes.ASC,
      );
    }

    const pagination = new PaginationOffset(
      query.pagination?.limit,
      query.pagination?.offset,
      query.pagination?.withTotal,
    );

    const criteria = new Criteria({
      filters,
      order,
      pagination,
    });

    const result = await this.userRepository.findByCriteria(criteria);
    return {
      data: result.data.map((user) => user.toValue()),
      pagination: {
        hasNext: true,
        total: result.total,
      },
    };
  }

  async authorize(_query: GetUsers_Query) {
    // TODO: Implement authorization logic
    return true;
  }

  async validate(_query: GetUsers_Query) {
    // TODO: Implement validation logic
  }
}
