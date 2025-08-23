import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RegisterChannelResponseDto } from './register-channel.response';
import {
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { RegisterChannelBody } from './register-channel.body';
import { RegisterChannelCommand } from '../../../../../application/commands/register-channel/register-channel.command';

@ApiTags('channels')
@Controller('channels')
export class RegisterChannelController {
  constructor(
    private readonly commandBus: CommandBus,
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
    description:
      'Business rule violation (user not found, too many channels, duplicate name) or invalid input data',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid channel configuration',
  })
  async registerChannel(@Body() dto: RegisterChannelBody) {

    const command = new RegisterChannelCommand({
      channelType: dto.channelType,
      name: dto.name,
      userId: dto.userId,
      connectionConfig: dto.connectionConfig,
    });

    const result = await this.commandBus.execute(command);

    return new RegisterChannelResponseDto(result.id);
  }
}