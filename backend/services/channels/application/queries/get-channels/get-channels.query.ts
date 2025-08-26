import { IQuery } from '@nestjs/cqrs';

export class GetChannelsQuery implements IQuery {
  constructor(public readonly params: GetChannelsQueryParams) {}
}

export interface GetChannelsQueryParams {
  userId?: string;
  channelType?: string;
  isActive?: boolean;
  name?: string;
  createdAfter?: string;
  createdBefore?: string;

  orderBy?: string;
  orderType?: string;
  limit?: number;
  offset?: number;
}

export interface ChannelDto {
  id: string;
  channelType: string;
  name: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
}

export interface GetChannelsQueryResponse {
  channels: ChannelDto[];
}


