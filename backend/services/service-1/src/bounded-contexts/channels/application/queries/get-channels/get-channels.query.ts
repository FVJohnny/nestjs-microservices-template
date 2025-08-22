import { IQuery } from '@nestjs/cqrs';
import { ChannelCriteria } from '../../../domain/criteria/channel-criteria';

export class GetChannelsQuery implements IQuery {
  constructor(public readonly criteria: ChannelCriteria) {}
}
