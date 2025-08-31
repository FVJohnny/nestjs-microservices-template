import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GetUserByIdQuery, GetUserByIdQueryResponse } from '../../../../../application/queries';

@ApiTags('users')
@Controller('users')
export class GetUserController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: GetUserByIdQueryResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUser(@Param('id') id: string): Promise<GetUserByIdQueryResponse> {
    const query = new GetUserByIdQuery({ userId: id });
    return await this.queryBus.execute(query);
  }
}