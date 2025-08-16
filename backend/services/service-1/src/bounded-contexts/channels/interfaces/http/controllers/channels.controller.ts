import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RegisterChannelDto } from '../dtos/register-channel.dto';
import { RegisterChannelResponseDto } from '../dtos/register-channel-response.dto';
import { SimulateMessageDto } from '../dtos/simulate-message.dto';
import { SimulateMessageResponseDto } from '../dtos/simulate-message-response.dto';
import { GetChannelsResponseDto } from '../dtos/get-channels-response.dto';
import { ChannelDto } from '../dtos/channel.dto';
import { RegisterChannelCommand } from '../../../application/commands/register-channel.command';
import { GetChannelsQuery } from '../../../application/queries/get-channels.query';
import { Channel } from '../../../domain/entities/channel.entity';
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

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  private readonly logger = new CorrelationLogger(ChannelsController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new channel',
    description:
      'Creates a new communication channel (Telegram, Discord, or WhatsApp) for sending trading signals and messages.',
  })
  @ApiBody({
    type: RegisterChannelDto,
    description: 'Channel registration details',
  })
  @ApiResponse({
    status: 201,
    description: 'Channel registered successfully',
    type: RegisterChannelResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid channel configuration',
  })
  async registerChannel(@Body() dto: RegisterChannelDto) {
    this.logger.debug(
      `Registering channel for user ${dto.userId}, type: ${dto.channelType}`,
    );

    try {
      const command = new RegisterChannelCommand({
        channelType: dto.channelType,
        name: dto.name,
        userId: dto.userId,
        connectionConfig: dto.connectionConfig,
      });

      const channelId: string = await this.commandBus.execute(command);
      this.logger.log(
        `Channel registered successfully: ${channelId} for user ${dto.userId}`,
      );

      return new RegisterChannelResponseDto(channelId);
    } catch (error) {
      this.logger.error(`Failed to register channel: ${error.message}`);
      throw error; // Let global exception filter handle it
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get channels (optionally filtered by userId)',
    description:
      'Retrieves a list of all registered channels. Optionally filter by user ID to get channels for a specific user.',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter channels by user ID',
    example: 'user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'List of channels retrieved successfully',
    type: GetChannelsResponseDto,
  })
  async getChannels(@Query('userId') userId?: string) {
    this.logger.debug('Getting channels...');
    const query = new GetChannelsQuery(userId);
    const channels: Channel[] = await this.queryBus.execute(query);

    const channelDtos = channels.map(
      (channel) =>
        new ChannelDto(
          channel.id,
          channel.channelType.toString(),
          channel.name,
          channel.userId,
          channel.isActive,
          channel.createdAt,
        ),
    );

    return new GetChannelsResponseDto(channelDtos);
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
      // First verify channel exists by getting channels and finding this one
      const getChannelsQuery = new GetChannelsQuery();
      const channels: Channel[] = await this.queryBus.execute(getChannelsQuery);

      const channel = channels.find((c) => c.id === channelId);
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
