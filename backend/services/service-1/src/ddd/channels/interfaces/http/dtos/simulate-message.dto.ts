import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SimulateMessageDto {
  @ApiProperty({
    description: 'Unique identifier for the message',
    example: 'msg-123',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({
    description: 'Content of the message',
    example: 'BUY EURUSD at 1.0850, TP: 1.0900, SL: 1.0800',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'ID of the message sender',
    example: 'sender-456',
  })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({
    description: 'Display name of the message sender',
    example: 'Trading Bot',
  })
  @IsString()
  @IsNotEmpty()
  senderName: string;

  @ApiProperty({
    description: 'Additional message metadata',
    example: {
      timestamp: '2025-08-13T10:30:00Z',
      platform: 'telegram',
      messageType: 'signal',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}