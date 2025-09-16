import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetUserById_Query, GetUserByIdQueryResponse } from '@bc/auth/application/queries';

@ApiTags('users')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('users')
export class GetUser_Controller {
  constructor(private readonly queryBus: QueryBus) {}

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
