import { QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUsersQuery } from './get-users.query';
import { GetUsersQueryResponse } from './get-users.response';
import { USER_REPOSITORY, type UserRepository } from '../../../domain/repositories/user.repository';
import { Criteria, Filters, Filter, FilterField, FilterOperator, FilterValue, Operator, OrderTypes, Order, BaseQueryHandler, OffsetPageParams, OffsetPageResultPagination } from '@libs/nestjs-common';


@QueryHandler(GetUsersQuery)
export class GetUsersQueryHandler extends BaseQueryHandler<GetUsersQuery, GetUsersQueryResponse> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {
    super();
  }



  protected async handle(query: GetUsersQuery): Promise<GetUsersQueryResponse> {
    const filterList: Filter[] = [];
    
    // Handle specific status filter
    if (query.status) {
      const statusFilter = new Filter(
        new FilterField('status'),
        FilterOperator.fromValue(Operator.EQUAL),
        new FilterValue(query.status)
      );
      filterList.push(statusFilter);
    }
    
    // Handle role filter (single value equality)
    if (query.role) {
      const roleFilter = new Filter(
        new FilterField('role'),
        FilterOperator.fromValue(Operator.EQUAL),
        new FilterValue(query.role)
      );
      filterList.push(roleFilter);
    }
    
    // Handle email filter (partial match)
    if (query.email) {
      const emailFilter = new Filter(
        new FilterField('email'),
        FilterOperator.fromValue(Operator.CONTAINS),
        new FilterValue(query.email)
      );
      filterList.push(emailFilter);
    }
    
    // Handle username filter (partial match)
    if (query.username) {
      const usernameFilter = new Filter(
        new FilterField('username'),
        FilterOperator.fromValue(Operator.CONTAINS),
        new FilterValue(query.username)
      );
      filterList.push(usernameFilter);
    }
    
    // Handle firstName filter (partial match)
    if (query.firstName) {
      const firstNameFilter = new Filter(
        new FilterField('profile.firstName'),
        FilterOperator.fromValue(Operator.CONTAINS),
        new FilterValue(query.firstName)
      );
      filterList.push(firstNameFilter);
    }
    
    // Handle lastName filter (partial match)
    if (query.lastName) {
      const lastNameFilter = new Filter(
        new FilterField('profile.lastName'),
        FilterOperator.fromValue(Operator.CONTAINS),
        new FilterValue(query.lastName)
      );
      filterList.push(lastNameFilter);
    }
    
    const filters = new Filters(filterList);
    
    let order = Order.none();
    if (query.pagination?.sort) {
      order = Order.fromValues(query.pagination.sort.field, query.pagination.sort.order || OrderTypes.ASC);
    }

    const criteria = new Criteria({
      filters,
      order,
      limit: query.pagination?.limit,
      offset: query.pagination?.offset,
      withTotal: query.pagination?.withTotal
    });

    const offsetPageResult = await this.userRepository.findByCriteria(criteria);

    const pagination: OffsetPageResultPagination = {
      kind: 'offset',
      limit: query.pagination?.limit || 0,
      offset: query.pagination?.offset || 0,
      hasNext: true,
      total: offsetPageResult.total,
    };
    
    return { data: offsetPageResult.data.map(user => user.toValue()), pagination };
  }

  protected async authorize(query: GetUsersQuery): Promise<boolean> {
    // TODO: Implement authorization logic
    return true; 
  }

  protected async validate(query: GetUsersQuery): Promise<void> {
    // TODO: Implement validation logic
    // For example: validate limit/offset ranges, orderBy field names, etc.
  }
}
