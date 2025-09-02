import { QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUsersQuery } from './get-users.query';
import { GetUsersQueryResponse } from './get-users.response';
import { USER_REPOSITORY, type UserRepository } from '../../../domain/repositories/user.repository';
import { Criteria, Filters, Filter, FilterField, FilterOperator, FilterValue, Operator, OrderTypes, Order, BaseQueryHandler } from '@libs/nestjs-common';
import { UserStatusEnum } from '../../../domain/value-objects/user-status.vo';


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
    
    // Handle ordering - use createdAt DESC as default to avoid empty string issues
    let order = Order.none(); // Default ordering
    if (query.orderBy) {
      order = Order.fromValues(query.orderBy, query.orderType || OrderTypes.ASC);
    }

    const criteria = new Criteria({
      filters,
      order,
      limit: query.limit,
      offset: query.offset
    });

    const users = await this.userRepository.findByCriteria(criteria);

    return { users: users.map(user => user.toValue()) };
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
