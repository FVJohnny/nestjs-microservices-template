import { ApiProperty } from '@nestjs/swagger';
import { ChannelDto } from '../../../dtos/channel.dto';

export class GetChannelsResponseDto {
  @ApiProperty({
    description: 'List of channels',
    type: () => ChannelDto,
    isArray: true,
  })
  channels: ChannelDto[];
}
