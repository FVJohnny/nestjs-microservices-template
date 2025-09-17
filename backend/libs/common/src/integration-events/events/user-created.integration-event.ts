import { ApplicationException } from '../../errors';
import { BaseIntegrationEvent, type BaseIntegrationEventProps } from './base-integration-event';
import { Topics } from './topics';

interface UserCreated_IntegrationEventProps extends BaseIntegrationEventProps {
  userId: string;
  email: string;
  username: string;
  role: string;
}

export class UserCreated_IntegrationEvent extends BaseIntegrationEvent {
  static readonly version = '1.0';
  static readonly name = Topics.USERS.events.USER_CREATED;
  static readonly topic = Topics.USERS.topic;

  public readonly userId: string;
  public readonly email: string;
  public readonly username: string;
  public readonly role: string;

  constructor(props: UserCreated_IntegrationEventProps) {
    super(props);

    this.userId = props.userId;
    this.email = props.email;
    this.username = props.username;
    this.role = props.role;

    this.validate();
  }

  protected toEventJSON(): Record<string, unknown> {
    return {
      topic: UserCreated_IntegrationEvent.topic,
      name: UserCreated_IntegrationEvent.name,
      version: UserCreated_IntegrationEvent.version,

      userId: this.userId,
      email: this.email,
      username: this.username,
      role: this.role,
    };
  }

  static fromJSON(json: Record<string, unknown>): UserCreated_IntegrationEvent {
    const event = new UserCreated_IntegrationEvent({
      id: json.id as string,
      occurredOn: json.occurredOn ? new Date(json.occurredOn as string) : undefined,

      userId: json.userId as string,
      email: json.email as string,
      username: json.username as string,
      role: json.role as string,
    });

    return event;
  }

  protected validate(): void {
    super.validate();
    if (!this.userId) throw new ApplicationException('userId is required');
    if (!this.email) throw new ApplicationException('email is required');
    if (!this.username) throw new ApplicationException('username is required');
    if (!this.role) throw new ApplicationException('role is required');
  }
}
