import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RegisterChannelDto } from '../dto/register-channel.dto';
import { ChannelDto } from '../dto/channel.dto';
import { RegisterChannelCommand } from '../../application/commands/register-channel.command';
import { GetChannelsQuery } from '../../application/queries/get-channels.query';
import { Channel } from '../../domain/entities/channel.entity';
import { Logger } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {

  private readonly logger = new Logger(ChannelsController.name);
  
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new channel' })
  @ApiBody({ type: RegisterChannelDto })
  async registerChannel(@Body() dto: RegisterChannelDto): Promise<{ channelId: string }> {
    this.logger.log('Registering channel...');
    const command = new RegisterChannelCommand(
      dto.channelType,
      dto.name,
      dto.userId,
      dto.connectionConfig,
    );

    const channelId = await this.commandBus.execute(command);
    return { channelId };
  }

  @Get()
  @ApiOperation({ summary: 'Get channels (optionally filtered by userId)' })
  @ApiQuery({ name: 'userId', required: false })
  async getChannels(@Query('userId') userId?: string): Promise<ChannelDto[]> {
    this.logger.log('Getting channels...');
    const query = new GetChannelsQuery(userId);
    const channels: Channel[] = await this.queryBus.execute(query);

    return channels.map(channel => new ChannelDto(
      channel.id,
      channel.channelType.toString(),
      channel.name,
      channel.userId,
      channel.isActive,
      channel.createdAt,
    ));
  }

  // Simulate receiving a message (in real implementation, this would come from external integrations)
  @Post(':channelId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate receiving a message for a channel' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string' },
        content: { type: 'string' },
        senderId: { type: 'string' },
        senderName: { type: 'string' },
        metadata: { type: 'object', additionalProperties: true },
      },
      required: ['messageId', 'content', 'senderId', 'senderName'],
    },
  })
  async simulateMessage(
    @Body() messageData: {
      messageId: string;
      content: string;
      senderId: string;
      senderName: string;
      metadata?: Record<string, any>;
    },
  ): Promise<{ success: boolean }> {
    this.logger.log('Simulating message...');
    // This is a simplified example - in reality, messages would come from
    // external integrations (Telegram bot, Discord bot, etc.)
    // For now, we'll just return success
    return { success: true };
  }
}
