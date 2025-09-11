import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@libs/nestjs-common';
import { GetUsersQuery, GetUsersQueryResponse } from '../../../../../application/queries';
import { GetUsersControllerParams } from './get-users.params';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class GetUsersController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Get users with criteria filtering' })
  @ApiResponse({
    status: 200,
    description: 'User IDs retrieved successfully',
    type: Object,
  })
  async getUsers(@Query() params: GetUsersControllerParams): Promise<GetUsersQueryResponse> {
    const query = new GetUsersQuery({
      userId: params.userId,
      status: params.status,
      role: params.role,
      email: params.email,
      username: params.username,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        sort: {
          field: params.orderBy,
          order: params.orderType,
        },
      },
    });
    return await this.queryBus.execute(query);
  }
}
