import { DomainValidationException } from '@libs/nestjs-common';

/**
 * Domain errors for Channel aggregate
 */

export class InvalidChannelTypeError extends DomainValidationException {
  constructor(channelType: string) {
    super('channelType', channelType, `Invalid channel type: ${channelType}`, {
      channelType,
    });
  }
}
