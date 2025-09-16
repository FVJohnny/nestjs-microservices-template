import type { TracingMetadata } from '../../tracing/tracing-metadata';
import { BaseIntegrationEvent, type BaseIntegrationEventProps } from './base-integration-event';
import { Topics } from './topics';

export interface UserExample_IntegrationEventProps extends BaseIntegrationEventProps {
  userId?: string;
  action?: string;
}

export class UserExample_IntegrationEvent extends BaseIntegrationEvent {
  static readonly version = '1.0';
  static readonly name = Topics.USERS.events.USER_EXAMPLE;
  static readonly topic = Topics.USERS.topic;

  constructor(props: UserExample_IntegrationEventProps, metadata?: TracingMetadata) {
    super(props, metadata);
  }

  protected toEventJSON(): Record<string, unknown> {
    return {
      topic: UserExample_IntegrationEvent.topic,
      name: UserExample_IntegrationEvent.name,
      version: UserExample_IntegrationEvent.version,

      occurredOn: this.occurredOn.toISOString(),
      metadata: this.metadata.toJSON(),
    };
  }

  static fromJSON(json: Record<string, unknown>): UserExample_IntegrationEvent {
    const event = new UserExample_IntegrationEvent(
      {
        occurredOn: json.occurredOn ? new Date(json.occurredOn as string) : undefined,
      },
      json.metadata as TracingMetadata,
    );
    event.validate();
    return event;
  }
}
