import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@libs/nestjs-common';
import { GetUserByIdQuery } from '../../../../../application/queries';
import { GetUserByIdQueryResponse } from 'src/bounded-contexts/auth/application/queries/get-user-by-id/get-user-by-id.response';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class GetUserController {
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
    const query = new GetUserByIdQuery({ userId });
    return await this.queryBus.execute(query);
  }
}
