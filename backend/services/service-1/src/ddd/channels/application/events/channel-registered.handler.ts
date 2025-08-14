import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ChannelRegisteredEvent } from '../../domain/events/channel-registered.event';
import type { MessagePublisher } from '@libs/nestjs-ddd';
import { CorrelationLogger } from '@libs/nestjs-common';

@EventsHandler(ChannelRegisteredEvent)
export class ChannelRegisteredHandler
  implements IEventHandler<ChannelRegisteredEvent>
{
  private readonly logger = new CorrelationLogger(
    ChannelRegisteredHandler.name,
  );

  constructor(
    @Inject('MessagePublisher')
    private readonly messagePublisher: MessagePublisher,
  ) {}

  async handle(event: ChannelRegisteredEvent): Promise<void> {
    this.logger.log('Publishing ChannelRegisteredEvent to message broker...');

    const message = {
      eventId: `${event.aggregateId}-${Date.now()}`,
      eventName: event.constructor.name,
      aggregateId: event.aggregateId,
      channelType: event.channelType,
      channelName: event.channelName,
      userId: event.userId,
      occurredOn: event.occurredOn.toISOString(),
      metadata: {
        hasConnectionConfig: !!event.connectionConfig,
      },
    };

    try {
      await this.messagePublisher.publish('channel-events', message);
      this.logger.log(
        `Published ChannelRegisteredEvent to message broker: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to publish ChannelRegisteredEvent`, error);
      throw error;
    }
  }
}
