import { ApiProperty } from '@nestjs/swagger';

export class RegisterChannelResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the created channel',
    example: 'channel-uuid-123',
  })
  channelId: string;

  constructor(channelId: string) {
    this.channelId = channelId;
  }
}
