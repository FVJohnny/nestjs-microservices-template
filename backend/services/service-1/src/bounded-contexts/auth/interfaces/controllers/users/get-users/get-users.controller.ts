import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUsers_Query, GetUsersQueryResponse } from '@bc/auth/application/queries';
import { GetUsers_ControllerParams } from './get-users.params';
import { CorrelationLogger } from '@libs/nestjs-common';

@ApiTags('users')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('users')
export class GetUsers_Controller {
  private readonly logger = new CorrelationLogger(this.constructor.name);

  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Get users with criteria filtering' })
  @ApiResponse({
    status: 200,
    description: 'User IDs retrieved successfully',
    type: Object,
  })
  async getUsers(@Query() params: GetUsers_ControllerParams): Promise<GetUsersQueryResponse> {
    this.logger.debug(`Get users with params:`, params);
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
