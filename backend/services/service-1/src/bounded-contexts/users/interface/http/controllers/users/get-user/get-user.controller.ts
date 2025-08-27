import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GetUserByIdQuery } from '../../../../../application/queries/get-user-by-id.query';
import { GetUserResponseDto } from './get-user.response';

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
    type: GetUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUser(@Param('id') id: string): Promise<GetUserResponseDto> {
    const query = new GetUserByIdQuery(id);
    const user = await this.queryBus.execute(query);
    return GetUserResponseDto.fromEntity(user);
  }
}