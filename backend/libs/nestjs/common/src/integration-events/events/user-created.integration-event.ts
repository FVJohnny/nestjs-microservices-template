import { BaseIntegrationEvent } from './base-integration-event';
import { Topics } from './topics';

interface UserCreatedPayload {
  userId: string;
  email: string;
  username: string;
  roles: string[];
  occurredOn?: Date;
}

export class UserCreatedIntegrationEvent extends BaseIntegrationEvent {
  readonly eventVersion = '1.0';
  readonly eventName = Topics.USERS.events.USER_CREATED;
  readonly topic = Topics.USERS.topic;
  
  public readonly userId: string;
  public readonly email: string;
  public readonly username: string;
  public readonly roles: string[];
  
  constructor(
    payload: UserCreatedPayload
  ) {
    super(payload.occurredOn);

    this.userId = payload.userId;
    this.email = payload.email;
    this.username = payload.username;
    this.roles = payload.roles;
  }
  
  protected getEventData(): Record<string, any> {
    return {
      userId: this.userId,
      email: this.email,
      username: this.username,
      roles: this.roles,
    };
  }
  
  static fromJSON(json: any): UserCreatedIntegrationEvent {
    return new UserCreatedIntegrationEvent(
      {
        userId: json.userId,
        email: json.email,
        username: json.username,
        roles: json.roles,
        occurredOn: new Date(json.occurredOn),
      },
    );
  }
}