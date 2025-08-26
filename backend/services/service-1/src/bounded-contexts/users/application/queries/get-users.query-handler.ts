import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUsersQuery } from './get-users.query';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';

@QueryHandler(GetUsersQuery)
export class GetUsersQueryHandler implements IQueryHandler<GetUsersQuery> {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(query: GetUsersQuery): Promise<User[]> {
    if (query.onlyActive) {
      return this.userRepository.findActiveUsers();
    }

    const criteria = {
      limit: query.limit,
      offset: query.offset,
    };

    return this.userRepository.findByCriteria(criteria);
  }
}