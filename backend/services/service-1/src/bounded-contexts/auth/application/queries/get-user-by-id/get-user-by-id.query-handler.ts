import { QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUserById_Query } from './get-user-by-id.query';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { BaseQueryHandler, NotFoundException, Id } from '@libs/nestjs-common';
import { GetUserByIdQueryResponse } from './get-user-by-id.response';

@QueryHandler(GetUserById_Query)
export class GetUserById_QueryHandler extends BaseQueryHandler<
  GetUserById_Query,
  GetUserByIdQueryResponse
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
  ) {
    super();
  }

  protected async handle(query: GetUserById_Query): Promise<GetUserByIdQueryResponse> {
    const user = await this.userRepository.findById(new Id(query.userId));

    if (!user) {
      throw new NotFoundException();
    }

    return user.toValue();
  }

  protected authorize(_query: GetUserById_Query): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected validate(_query: GetUserById_Query): Promise<void> {
    // TODO: Implement validation logic
    // For example: validate userId format, ensure it's not empty, etc.
    return Promise.resolve();
  }
}
