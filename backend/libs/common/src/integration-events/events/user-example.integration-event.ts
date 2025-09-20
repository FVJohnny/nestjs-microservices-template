import { BaseIntegrationEvent, type BaseIntegrationEventProps } from './integration-event.base';
import { Topics } from './topics';

export interface UserExample_IntegrationEventProps extends BaseIntegrationEventProps {
  example: string;
}

export class UserExample_IntegrationEvent extends BaseIntegrationEvent {
  static readonly version = '1.0';
  static readonly name = Topics.USERS.events.USER_EXAMPLE;
  static readonly topic = Topics.USERS.topic;

  public readonly example: string;

  constructor(props: UserExample_IntegrationEventProps) {
    super(props);
    this.example = props.example;
  }

  protected toEventJSON(): Record<string, unknown> {
    return {
      topic: UserExample_IntegrationEvent.topic,
      name: UserExample_IntegrationEvent.name,
      version: UserExample_IntegrationEvent.version,
    };
  }

  static fromJSON(json: Record<string, unknown>): UserExample_IntegrationEvent {
    const event = new UserExample_IntegrationEvent({
      id: json.id as string,
      occurredOn: json.occurredOn ? new Date(json.occurredOn as string) : undefined,

      example: json.example as string,
    });
    event.validate();
    return event;
  }
}
