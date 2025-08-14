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
  async registerChannel(@Body() dto: RegisterChannelDto) {
    this.logger.debug('Registering channel...');
    const command = new RegisterChannelCommand(
      dto.channelType,
      dto.name,
      dto.userId,
      dto.connectionConfig,
    );

    const channelId: string = await this.commandBus.execute(command);
    return new RegisterChannelResponseDto(channelId);
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
  async simulateMessage(
    @Param('channelId') channelId: string,
    @Body() messageData: SimulateMessageDto,
  ) {
    this.logger.debug(
      `Simulating message for channel ${channelId} with data: ${JSON.stringify(messageData)}`,
    );
    // TODO: Implement actual message simulation logic
    return new SimulateMessageResponseDto(true);
  }
}
