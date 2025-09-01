import { QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { GetUserByIdQueryResponse } from './get-user-by-id.response';
import { USER_REPOSITORY, type UserRepository } from '../../../domain/repositories/user.repository';
import { BaseQueryHandler } from '@libs/nestjs-common';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdQueryHandler extends BaseQueryHandler<GetUserByIdQuery, GetUserByIdQueryResponse> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {
    super();
  }

  protected async handle(query: GetUserByIdQuery): Promise<GetUserByIdQueryResponse> {
    const user = await this.userRepository.findById(query.userId);
    
    if (!user) {
      throw new NotFoundException(`User with ID ${query.userId} not found`);
    }

    const profileData = user.profile.toValue();
    
    return {
      id: user.id,
      email: user.email.toValue(),
      username: user.username.toValue(),
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      status: user.status.toValue(),
      role: user.role.toValue(),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  protected async authorize(query: GetUserByIdQuery): Promise<boolean> {
    return true;
  }

  protected async validate(query: GetUserByIdQuery): Promise<void> {
    // TODO: Implement validation logic
    // For example: validate userId format, ensure it's not empty, etc.
  }

}