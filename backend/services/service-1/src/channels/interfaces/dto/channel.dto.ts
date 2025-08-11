export class ChannelDto {
  id: string;
  channelType: string;
  name: string;
  userId: string;
  isActive: boolean;
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
