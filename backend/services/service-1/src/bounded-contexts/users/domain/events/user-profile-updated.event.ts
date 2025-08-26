import { DomainEvent } from '@libs/nestjs-common';

export class UserProfileUpdatedEvent extends DomainEvent {
  constructor(
    public readonly payload: {
      userId: string;
      previousFirstName?: string;
      previousLastName?: string;
      firstName?: string;
      lastName?: string;
      metadata?: Record<string, any>;
      occurredOn: Date;
    },
  ) {
    super(payload.userId);
  }

  protected getPayload(): Record<string, any> {
    return this.payload;
  }
}