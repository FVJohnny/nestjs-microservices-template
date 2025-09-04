import type { TracingMetadataParams } from '../../tracing/tracing-metadata';
import type { BaseIntegrationEventProps } from './base-integration-event';
import { BaseIntegrationEvent } from './base-integration-event';
import { Topics } from './topics';

interface UserCreatedIntegrationEventProps extends BaseIntegrationEventProps {
  userId: string;
  email: string;
  username: string;
  role: string;
}

export class UserCreatedIntegrationEvent extends BaseIntegrationEvent {
  readonly version = '1.0';
  readonly name = Topics.USERS.events.USER_CREATED;
  readonly topic = Topics.USERS.topic;
  
  public readonly userId: string;
  public readonly email: string;
  public readonly username: string;
  public readonly role: string;
  
  constructor(
    props: UserCreatedIntegrationEventProps,
    metadata?: TracingMetadataParams
  ) {
    super(props, metadata);

    this.userId = props.userId;
    this.email = props.email;
    this.username = props.username;
    this.role = props.role;
  }
  
  protected toEventJSON(): Record<string, any> {
    return {
      userId: this.userId,
      email: this.email,
      username: this.username,
      role: this.role,
    };
  }
  
  static fromJSON(json: any): UserCreatedIntegrationEvent {
    const event = new UserCreatedIntegrationEvent(
      {
        userId: json.userId,
        email: json.email,
        username: json.username,
        role: json.role,
        occurredOn: new Date(json.occurredOn),
      },
      json.metadata
    );
    event.validate();
    return event;
  }
}