import { BaseIntegrationEvent } from './base-integration-event';
import { Topics } from './topics';

export interface UserCreatedPayload {
}

export class UserCreatedIntegrationEvent extends BaseIntegrationEvent {
  readonly eventVersion = '1.0';
  readonly eventName = Topics.USERS.events.USER_CREATED;
  readonly topic = Topics.USERS.topic;
  
  constructor(
    public readonly payload: UserCreatedPayload,
    occurredOn?: Date
  ) {
    super(occurredOn);
  }
  
  protected getEventData(): Record<string, any> {
    return this.payload;
  }
  
  static fromJSON(json: any): UserCreatedIntegrationEvent {
    return new UserCreatedIntegrationEvent(
      {
      },
      new Date(json.occurredOn)
    );
  }
}