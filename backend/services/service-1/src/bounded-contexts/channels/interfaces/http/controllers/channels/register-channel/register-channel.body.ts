import { IsString, IsNotEmpty, IsObject, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChannelType } from '../../../../../domain/value-objects/channel-type.vo';

export class RegisterChannelBody {
  @ApiProperty({
    description: 'Type of channel to register',
    enum: ChannelType,
    example: ChannelType.TELEGRAM,
  })
  @IsString()
  @IsNotEmpty()
  channelType: string;

  @ApiProperty({
    description: 'Human-readable name for the channel',
    example: 'My Trading Signals Channel',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'ID of the user who owns this channel',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Channel-specific connection configuration',
    example: {
      botToken: 'your-telegram-bot-token',
      chatId: '@your_channel_name',
      webhookUrl: 'https://api.telegram.org/bot<token>/setWebhook',
    },
  })
  @IsObject()
  connectionConfig: Record<string, any>;
}
