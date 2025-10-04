import { Controller, Get, Query } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { type IQueryBus } from '@nestjs/cqrs';
import { QUERY_BUS } from '@libs/nestjs-common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetUsers_Query, GetUsersQueryResponse } from '@bc/auth/application/queries';
import { GetUsers_ControllerParams } from './get-users.params';
import { CorrelationLogger } from '@libs/nestjs-common';
import { JwtAuthGuard } from '@libs/nestjs-common';
import { UseGuards } from '@nestjs/common';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class GetUsers_Controller {
  private readonly logger = new CorrelationLogger(this.constructor.name);

  constructor(@Inject(QUERY_BUS) private readonly queryBus: IQueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Get users with criteria filtering' })
  @ApiResponse({
    status: 200,
    description: 'User IDs retrieved successfully',
    type: Object,
  })
  async getUsers(@Query() params: GetUsers_ControllerParams): Promise<GetUsersQueryResponse> {
    this.logger.debug(`Get users with params: ${params}`);
    const query = new GetUsers_Query({
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
