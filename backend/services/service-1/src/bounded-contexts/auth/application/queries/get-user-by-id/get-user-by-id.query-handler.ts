import { Inject } from '@nestjs/common';
import { GetUserById_Query } from './get-user-by-id.query';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import { BaseQueryHandler, NotFoundException, Id } from '@libs/nestjs-common';
import { GetUserByIdQueryResponse } from './get-user-by-id.response';

export class GetUserById_QueryHandler extends BaseQueryHandler(
  GetUserById_Query,
)<GetUserByIdQueryResponse>() {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
  ) {
    super();
  }

  async handle(query: GetUserById_Query): Promise<GetUserByIdQueryResponse> {
    const user = await this.userRepository.findById(new Id(query.userId));

    if (!user) {
      throw new NotFoundException();
    }

    return user.toValue();
  }

  async authorize(_query: GetUserById_Query) {
    // TODO: Implement authorization logic
    return true;
  }

  async validate(_query: GetUserById_Query) {
    // TODO: Implement validation logic
  }
}
