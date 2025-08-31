import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GetUsersQuery, GetUsersQueryResponse } from '../../../../../application/queries';
import { GetUsersControllerParams } from './get-users.params';

@ApiTags('users')
@Controller('users')
export class GetUsersController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Get users with criteria filtering' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by user status (active, inactive, suspended, deleted)' })
  @ApiQuery({ name: 'roles', required: false, description: 'Filter by roles (comma-separated)' })
  @ApiQuery({ name: 'email', required: false, description: 'Filter by email (partial match)' })
  @ApiQuery({ name: 'username', required: false, description: 'Filter by username (partial match)' })
  @ApiQuery({ name: 'firstName', required: false, description: 'Filter by first name (partial match)' })
  @ApiQuery({ name: 'lastName', required: false, description: 'Filter by last name (partial match)' })
  @ApiQuery({ name: 'orderBy', required: false, description: 'Sort by field (createdAt, username, email, etc.)' })
  @ApiQuery({ name: 'orderType', required: false, description: 'Sort direction (ASC or DESC)', enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of results to skip', type: Number })
  @ApiQuery({ name: 'onlyActive', required: false, description: 'Legacy: filter only active users', type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'User IDs retrieved successfully',
    type: GetUsersQueryResponse,
  })
  async getUsers(@Query() params: GetUsersControllerParams): Promise<GetUsersQueryResponse> {
    const query = new GetUsersQuery({
      status: params.status,
      roles: params.roles,
      email: params.email,
      username: params.username,
      firstName: params.firstName,
      lastName: params.lastName,
      orderBy: params.orderBy,
      orderType: params.orderType,
      limit: params.limit,
      offset: params.offset,
      onlyActive: params.onlyActive
    });

    return await this.queryBus.execute(query);
  }
}