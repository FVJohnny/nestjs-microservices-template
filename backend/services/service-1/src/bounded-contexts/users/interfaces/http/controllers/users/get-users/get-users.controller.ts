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
  @ApiResponse({
    status: 200,
    description: 'User IDs retrieved successfully',
    type: GetUsersQueryResponse,
  })
  async getUsers(@Query() params: GetUsersControllerParams): Promise<GetUsersQueryResponse> {
    const query = new GetUsersQuery(params);
    return await this.queryBus.execute(query);
  }
}