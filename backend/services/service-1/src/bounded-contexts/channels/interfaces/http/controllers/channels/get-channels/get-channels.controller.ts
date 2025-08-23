import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CorrelationLogger } from '@libs/nestjs-common';
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';

import { GetChannelsQuery } from '../../../../../application/queries/get-channels/get-channels.query';
import { GetChannelsResponseDto } from './get-channels-response.dto';

@ApiTags('channels')
@Controller('channels')
export class GetChannelsController {

  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'Get channels with configurable filtering',
    description:
      'Retrieves channels with support for multiple optional filters including user ID, channel type, active status, name search, and date ranges.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter channels by user ID',
    example: 'user-123',
  })
  @ApiQuery({
    name: 'channelType',
    required: false,
    description: 'Filter channels by type (telegram, discord, whatsapp)',
    example: 'telegram',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter channels by active status',
    type: 'boolean',
    example: true,
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter channels by name (partial match, case-insensitive)',
    example: 'trading',
  })
  @ApiQuery({
    name: 'createdAfter',
    required: false,
    description: 'Filter channels created after this date (ISO string)',
    type: 'string',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'createdBefore',
    required: false,
    description: 'Filter channels created before this date (ISO string)',
    type: 'string',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    description: 'Order channels by this field',
    example: 'name',
  })
  @ApiQuery({
    name: 'orderType',
    required: false,
    description: 'Order type (asc, desc)',
    example: 'asc',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of channels returned',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset number of channels returned',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of channels retrieved successfully',
    type: GetChannelsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'User does not exist or invalid filter parameters',
  })
  async getChannels(
    @Query('userId') userId?: string,
    @Query('channelType') channelType?: string,
    @Query('isActive') isActive?: boolean,
    @Query('name') name?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderType') orderType?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {

    // Get channels using query with raw filters
    return await this.queryBus.execute(
      new GetChannelsQuery({
        userId,
        channelType,
        isActive,
        name,
        createdAfter,
        createdBefore,
        orderBy,
        orderType,
        limit,
        offset,
      }),
    );
  }
}