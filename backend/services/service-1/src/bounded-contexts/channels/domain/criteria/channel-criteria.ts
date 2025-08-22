export interface ChannelCriteria {
  userId?: string;
  channelType?: string;
  isActive?: boolean;
  name?: string;
  nameContains?: string; // For partial name matching
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'name' | 'channelType';
  sortOrder?: 'asc' | 'desc';
}

export class ChannelCriteriaBuilder {
  private criteria: ChannelCriteria = {};

  static create(): ChannelCriteriaBuilder {
    return new ChannelCriteriaBuilder();
  }

  userId(userId: string): this {
    this.criteria.userId = userId;
    return this;
  }

  channelType(channelType: string): this {
    this.criteria.channelType = channelType;
    return this;
  }

  isActive(isActive: boolean): this {
    this.criteria.isActive = isActive;
    return this;
  }

  name(name: string): this {
    this.criteria.name = name;
    return this;
  }

  nameContains(nameContains: string): this {
    this.criteria.nameContains = nameContains;
    return this;
  }

  createdAfter(createdAfter: Date): this {
    this.criteria.createdAfter = createdAfter;
    return this;
  }

  createdBefore(createdBefore: Date): this {
    this.criteria.createdBefore = createdBefore;
    return this;
  }

  limit(limit: number): this {
    this.criteria.limit = limit;
    return this;
  }

  offset(offset: number): this {
    this.criteria.offset = offset;
    return this;
  }

  sortBy(field: 'createdAt' | 'name' | 'channelType', order: 'asc' | 'desc' = 'desc'): this {
    this.criteria.sortBy = field;
    this.criteria.sortOrder = order;
    return this;
  }

  build(): ChannelCriteria {
    return { ...this.criteria };
  }
}