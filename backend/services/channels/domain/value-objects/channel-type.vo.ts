import { InvalidChannelTypeError } from '../errors';

export enum ChannelType {
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  WHATSAPP = 'whatsapp',
}

export class ChannelTypeVO {
  private constructor(private readonly value: ChannelType) {}

  static create(value: string): ChannelTypeVO {
    if (!Object.values(ChannelType).includes(value as ChannelType)) {
      throw new InvalidChannelTypeError(value);
    }
    return new ChannelTypeVO(value as ChannelType);
  }

  getValue(): ChannelType {
    return this.value;
  }

  equals(other: ChannelTypeVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
