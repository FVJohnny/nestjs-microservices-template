import { ApiProperty } from '@nestjs/swagger';
import { ChannelDto } from './channel.dto';

export class GetChannelsResponseDto {
  @ApiProperty({
    description: 'Array of channels',
    type: [ChannelDto],
  })
  channels: ChannelDto[];

  @ApiProperty({
    description: 'Total number of channels found',
    example: 3,
  })
  total: number;

  constructor(channels: ChannelDto[]) {
    this.channels = channels;
    this.total = channels.length;
  }
}
