import { IsString, IsNotEmpty, IsObject, IsIn } from 'class-validator';
import { ChannelType } from '../../domain/value-objects/channel-type.vo';

export class RegisterChannelDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(ChannelType))
  channelType: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsObject()
  connectionConfig: Record<string, any>;
}
