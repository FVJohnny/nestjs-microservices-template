export interface GetChannelsRequest {
  userId?: string;
  channelType?: string;
  isActive?: boolean;
  name?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface GetChannelsResponse {
  channels: ChannelSummary[];
  totalCount: number;
  appliedFilters: GetChannelsRequest;
}

export interface ChannelSummary {
  id: string;
  name: string;
  channelType: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  // Note: We don't expose connectionConfig for security reasons
}
