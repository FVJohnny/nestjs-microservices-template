import { Injectable } from '@nestjs/common';
import { BaseIntegrationEventListener } from './integration-event-listener.base';
import { ParsedIntegrationMessage } from '../types/integration-event.types';

@Injectable()
export class InMemoryIntegrationEventListener extends BaseIntegrationEventListener {
  private topics: string[] = [];
  protected async subscribeToTopic(topicName: string): Promise<void> {
    this.topics.push(topicName);
  }
  protected async unsubscribeFromTopic(topicName: string): Promise<void> {
    this.topics = this.topics.filter((topic) => topic !== topicName);
  }
  protected parseMessage(_rawMessage: unknown): ParsedIntegrationMessage {
    return {
      id: 'id',
      name: 'name',
      metadata: {
        id: 'id',
        correlationId: 'correlationId',
      },
    };
  }
}
