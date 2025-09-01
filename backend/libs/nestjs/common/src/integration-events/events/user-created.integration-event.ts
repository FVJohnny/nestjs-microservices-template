import { TracingMetadataParams } from '../../tracing/tracing-metadata';
import { BaseIntegrationEvent, BaseIntegrationEventProps } from './base-integration-event';
import { Topics } from './topics';

interface UserCreatedIntegrationEventProps extends BaseIntegrationEventProps {
  userId: string;
  email: string;
  username: string;
  roles: string[];
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
    props: UserCreatedIntegrationEventProps,
    metadata?: TracingMetadataParams
  ) {
    super(props, metadata);

    this.userId = props.userId;
    this.email = props.email;
    this.username = props.username;
    this.roles = props.roles;
  }
  
  protected toEventJSON(): Record<string, any> {
    return {
      userId: this.userId,
      email: this.email,
      username: this.username,
      roles: this.roles,
    };
  }
  
  static fromJSON(json: any): UserCreatedIntegrationEvent {
    const event = new UserCreatedIntegrationEvent(
      {
        userId: json.userId,
        email: json.email,
        username: json.username,
        roles: json.roles,
        occurredOn: new Date(json.occurredOn),
      },
      json.metadata
    );
    event.validate();
    return event;
  }
}