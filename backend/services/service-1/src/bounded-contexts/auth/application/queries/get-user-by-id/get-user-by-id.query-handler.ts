import { QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { USER_REPOSITORY, type UserRepository } from '../../../domain/repositories/user.repository';
import { BaseQueryHandler, NotFoundException } from '@libs/nestjs-common';
import { GetUserByIdQueryResponse } from './get-user-by-id.response';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdQueryHandler extends BaseQueryHandler<
  GetUserByIdQuery,
  GetUserByIdQueryResponse
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {
    super();
  }

  protected async handle(query: GetUserByIdQuery): Promise<GetUserByIdQueryResponse> {
    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      throw new NotFoundException();
    }

    return user.toValue();
  }

  protected authorize(_query: GetUserByIdQuery): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected validate(_query: GetUserByIdQuery): Promise<void> {
    // TODO: Implement validation logic
    // For example: validate userId format, ensure it's not empty, etc.
    return Promise.resolve();
  }
}
