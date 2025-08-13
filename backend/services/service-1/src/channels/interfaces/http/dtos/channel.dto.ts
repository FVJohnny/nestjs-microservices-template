import { ApiProperty } from '@nestjs/swagger';

export class ChannelDto {
  @ApiProperty({
    description: 'Unique identifier of the channel',
    example: 'channel-uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Type of communication channel',
    example: 'telegram',
    enum: ['telegram', 'discord', 'whatsapp'],
  })
  channelType: string;

  @ApiProperty({
    description: 'Human-readable name of the channel',
    example: 'My Trading Signals Channel',
  })
  name: string;

  @ApiProperty({
    description: 'ID of the user who owns this channel',
    example: 'user-123',
  })
  userId: string;

  @ApiProperty({
    description: 'Whether the channel is currently active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'ISO timestamp when the channel was created',
    example: '2025-08-13T10:30:00.000Z',
  })
  createdAt: string;

  constructor(
    id: string,
    channelType: string,
    name: string,
    userId: string,
    isActive: boolean,
    createdAt: Date,
  ) {
    this.id = id;
    this.channelType = channelType;
    this.name = name;
    this.userId = userId;
    this.isActive = isActive;
    this.createdAt = createdAt.toISOString();
  }
}
