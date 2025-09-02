import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GetUsersQuery, GetUsersQueryResponse } from '../../../../../application/queries';
import { GetUsersControllerParams } from './get-users.params';
import { OffsetPageParams, SortParam } from '@libs/nestjs-common';

@ApiTags('users')
@Controller('users')
export class GetUsersController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Get users with criteria filtering' })
  @ApiResponse({
    status: 200,
    description: 'User IDs retrieved successfully',
    type: GetUsersQueryResponse,
  })
  async getUsers(@Query() params: GetUsersControllerParams): Promise<GetUsersQueryResponse> {

    console.log("params is ", params);
    const sort: SortParam | undefined = params.orderBy && params.orderType ? {
      field: params.orderBy,
      order: params.orderType,
    } : undefined;

    const query = new GetUsersQuery({
      status: params.status,
      role: params.role,
      email: params.email,
      username: params.username,
      firstName: params.firstName,
      lastName: params.lastName,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        sort,
      },
    });
    return await this.queryBus.execute(query);
  }
}