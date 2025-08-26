import { BaseIntegrationEvent } from './base-integration-event';
import { Topics } from './topics';

export interface UserExamplePayload {
}

export class UserExampleIntegrationEvent extends BaseIntegrationEvent {
  readonly eventVersion = '1.0';
  readonly eventName = Topics.USERS.events.USER_EXAMPLE;
  readonly topic = Topics.USERS.topic;
  
  constructor(
    public readonly payload: UserExamplePayload,
    occurredOn?: Date
  ) {
    super(occurredOn);
  }
  
  protected getEventData(): Record<string, any> {
    return this.payload;
  }
  
  static fromJSON(json: any): UserExampleIntegrationEvent {
    return new UserExampleIntegrationEvent(
      {
      },
      new Date(json.occurredOn)
    );
  }
}