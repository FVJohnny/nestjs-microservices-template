import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { GetUserByIdQueryResponse } from './get-user-by-id.response';
import type { UserRepository } from '../../../domain/repositories/user.repository';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdQueryHandler implements IQueryHandler<GetUserByIdQuery, GetUserByIdQueryResponse> {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(query: GetUserByIdQuery): Promise<GetUserByIdQueryResponse> {
    const user = await this.userRepository.findById(query.userId);
    
    if (!user) {
      throw new NotFoundException(`User with ID ${query.userId} not found`);
    }

    return {
      id: user.id,
      email: user.email.value,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status.value,
      roles: user.roles.map(role => role.value),
      metadata: user.metadata,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}