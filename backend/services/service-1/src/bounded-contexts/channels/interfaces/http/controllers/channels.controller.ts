import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { RegisterChannelDto } from '../dtos/register-channel.dto';
import { RegisterChannelResponseDto } from '../dtos/register-channel-response.dto';
import { SimulateMessageDto } from '../dtos/simulate-message.dto';
import { SimulateMessageResponseDto } from '../dtos/simulate-message-response.dto';
import { GetChannelsResponseDto } from '../dtos/get-channels-response.dto';
import { ChannelDto } from '../dtos/channel.dto';
import { CorrelationLogger } from '@libs/nestjs-common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { EntityNotFoundException } from '@libs/nestjs-common';

// Use Cases
import type { RegisterChannelUseCase } from '../../../application/use-cases/register-channel/register-channel.use-case';
import type { GetChannelsUseCase } from '../../../application/use-cases/get-channels/get-channels.use-case';
import {
  UserNotFoundError,
  TooManyChannelsError,
  DuplicateChannelNameError,
} from '../../../application/use-cases/register-channel/register-channel.request-response';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  private readonly logger = new CorrelationLogger(ChannelsController.name);

  constructor(
    // Use Cases
    @Inject('RegisterChannelUseCase')
    private readonly registerChannelUseCase: RegisterChannelUseCase,
    @Inject('GetChannelsUseCase')
    private readonly getChannelsUseCase: GetChannelsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new channel',
    description:
      'Creates a new communication channel (Telegram, Discord, or WhatsApp) with business rule validation including user existence, channel limits, and name uniqueness.',
  })
  @ApiBody({
    type: RegisterChannelResponseDto,
    description: 'Channel registration details',
  })
  @ApiResponse({
    status: 201,
    description: 'Channel registered successfully',
    type: RegisterChannelResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Business rule violation (user not found, too many channels, duplicate name) or invalid input data',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid channel configuration',
  })
  async registerChannel(@Body() dto: RegisterChannelDto) {
    this.logger.debug(
      `Registering channel for user ${dto.userId}, type: ${dto.channelType}`,
    );

    const response = await this.registerChannelUseCase.execute({
      userId: dto.userId,
      channelType: dto.channelType,
      name: dto.name,
      connectionConfig: dto.connectionConfig,
    });

    this.logger.log(
      `Channel registered successfully: ${response.channelId} for user ${dto.userId}`,
    );

    return new RegisterChannelResponseDto(response.channelId);
  }

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
  ) {
    const filters = {
      userId,
      channelType,
      isActive,
      name,
      createdAfter: createdAfter ? new Date(createdAfter) : undefined,
      createdBefore: createdBefore ? new Date(createdBefore) : undefined,
    };

    this.logger.debug(`Getting channels with filters: ${JSON.stringify(filters)}`);

    try {
      const response = await this.getChannelsUseCase.execute(filters);

      // Transform to the existing DTO format for backward compatibility
      const channelDtos = response.channels.map(
        (channel) =>
          new ChannelDto(
            channel.id,
            channel.channelType,
            channel.name,
            channel.userId,
            channel.isActive,
            channel.createdAt,
          ),
      );

      return new GetChannelsResponseDto(channelDtos);
    } catch (error) {
      this.logger.error(`Failed to get channels: ${error.message}`);
      
      if (error instanceof UserNotFoundError) {
        throw new BadRequestException('User does not exist');
      }
      
      throw error;
    }
  }

  // Simulate receiving a message (in real implementation, this would come from external integrations)
  @Post(':channelId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulate receiving a message for a channel',
    description:
      'Simulates receiving a message from an external platform (Telegram, Discord, etc.). In production, this would be triggered by webhooks from the actual platforms.',
  })
  @ApiParam({
    name: 'channelId',
    description: 'Unique identifier of the channel to send the message to',
    example: 'channel-uuid-123',
  })
  @ApiBody({
    type: SimulateMessageDto,
    description: 'Message data to simulate',
  })
  @ApiResponse({
    status: 200,
    description: 'Message simulation completed',
    type: SimulateMessageResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Channel not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Message simulation failed',
  })
  async simulateMessage(
    @Param('channelId') channelId: string,
    @Body() messageData: SimulateMessageDto,
  ) {
    this.logger.debug(`Simulating message for channel ${channelId}`);

    try {
      // First verify channel exists by getting all channels and finding this one
      const response = await this.getChannelsUseCase.execute({});
      const channel = response.channels.find((c) => c.id === channelId);
      if (!channel) {
        throw new EntityNotFoundException('Channel', channelId);
      }

      // Simulate some validation that could fail
      if (!messageData.content || messageData.content.trim().length === 0) {
        throw new Error('Message content cannot be empty');
      }

      // TODO: Implement actual message simulation logic
      this.logger.log(`Message simulation completed for channel ${channelId}`);

      return new SimulateMessageResponseDto(true);
    } catch (error) {
      this.logger.error(
        `Message simulation failed for channel ${channelId}: ${error.message}`,
      );
      throw error; // Let global exception filter handle it
    }
  }
}
