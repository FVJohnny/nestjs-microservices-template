import { ApiProperty } from '@nestjs/swagger';

export class ChannelDto {
  @ApiProperty({
    description: 'Unique identifier of the channel',
    example: 'channel-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Type of the channel',
    example: 'telegram',
    enum: ['telegram', 'discord', 'whatsapp'],
  })
  channelType: string;

  @ApiProperty({
    description: 'Name of the channel',
    example: 'Trading Signals',
  })
  name: string;

  @ApiProperty({
    description: 'User ID who owns the channel',
    example: 'user-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Whether the channel is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'When the channel was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  constructor(
    id: string,
    channelType: string,
    name: string,
    userId: string,
    isActive: boolean,
    createdAt: string,
  ) {
    this.id = id;
    this.channelType = channelType;
    this.name = name;
    this.userId = userId;
    this.isActive = isActive;
    this.createdAt = createdAt;
  }
}