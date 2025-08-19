import { IEventHandler } from "@nestjs/cqrs";
import { ChannelRegisteredDomainEvent, ChannelRegisteredDomainEventProps } from "../../../domain/events/channel-registered.domain-event";
import { ChannelTypeVO } from "../../../domain/value-objects/channel-type.vo";
import { ChannelRegisteredDomainEventHandler } from "./channel-registered.domain-event-handler";
import { INTEGRATION_EVENT_TOPIC_CHANNELS } from "@libs/nestjs-types";
import { createTestingModule } from "../../../../../testing";

async function executeEvent(
  handler: IEventHandler | undefined
) {
  if (!handler) throw Error("Event Handler is undefined!!")

  const eventProps: ChannelRegisteredDomainEventProps = {
    aggregateId: 'jojojo',
    channelType: ChannelTypeVO.create('telegram'),
    channelName: 'namesito',
    userId:  'user-1',
    connectionConfig: { token: 'abc' },
  };
  const domainEvent = new ChannelRegisteredDomainEvent(eventProps);
  await handler.handle(domainEvent);

  return { domainEvent };
}

async function setupTestingModule({shouldDomainEventPublishFail}) {
  return await createTestingModule({
    events: {
      eventHandler: ChannelRegisteredDomainEventHandler,
      shouldDomainEventPublishFail,
    },
  });
}

describe('RegisterChannelCommandHandler', () => {

  it('publishes an integration event ChannelCreatedIntegrationEvent :D', async () => {
    const { eventHandler, eventPublisher } = await setupTestingModule({shouldDomainEventPublishFail: false})
    
    const { domainEvent } = await executeEvent(eventHandler);

    const lastEvent = eventPublisher.events.pop();
    expect(lastEvent.topic).toBe(INTEGRATION_EVENT_TOPIC_CHANNELS)
    expect(lastEvent.eventName).toBe('channel.created')
    expect(lastEvent.data.channelId).toBe(domainEvent.aggregateId)
    expect(lastEvent.data.channelName).toBe(domainEvent.channelName)
    expect(lastEvent.data.channelType).toBe(domainEvent.channelType.getValue())
    expect(lastEvent.data.userId).toBe(domainEvent.userId)
  });

});
