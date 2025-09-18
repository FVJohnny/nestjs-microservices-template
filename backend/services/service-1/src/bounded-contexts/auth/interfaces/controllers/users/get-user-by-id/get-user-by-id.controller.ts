import { Controller, Get, Param } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type IQueryBus } from '@nestjs/cqrs';
import { QUERY_BUS } from '@libs/nestjs-common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetUserById_Query, GetUserByIdQueryResponse } from '@bc/auth/application/queries';
import { JwtAuthGuard } from '@libs/nestjs-common';
import { UseGuards } from '@nestjs/common';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GetUser_Controller {
  constructor(@Inject(QUERY_BUS) private readonly queryBus: IQueryBus) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: GetUserByIdQueryResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUser(@Param('userId') userId: string): Promise<GetUserByIdQueryResponse> {
    const query = new GetUserById_Query({ userId });
    return await this.queryBus.execute(query);
  }
}
