import type { TracingMetadataParams } from '../../tracing/tracing-metadata';
import { BaseIntegrationEvent, type BaseIntegrationEventProps } from './base-integration-event';
import { Topics } from './topics';

export interface UserExampleIntegrationEventProps extends BaseIntegrationEventProps {
}

export class UserExampleIntegrationEvent extends BaseIntegrationEvent {
  readonly version = '1.0';
  readonly name = Topics.USERS.events.USER_EXAMPLE;
  readonly topic = Topics.USERS.topic;
  
  constructor(
    props: UserExampleIntegrationEventProps,
    metadata?: TracingMetadataParams
  ) {
    super(props, metadata);
  }
  
  protected toEventJSON(): Record<string, any> {
    return {}
  }
  
  static fromJSON(json: any): UserExampleIntegrationEvent {
    const event = new UserExampleIntegrationEvent(
      {
        occurredOn: json.occurredOn ? new Date(json.occurredOn) : undefined,
      },
      json.metadata
    );
    event.validate();
    return event;
  }
}