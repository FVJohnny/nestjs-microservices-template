import { ChannelRegisteredDomainEventHandler } from './channel-registered.domain-event-handler';
import { ChannelRegisteredDomainEvent } from '../../domain/events/channel-registered.domain-event';
import { ChannelTypeVO } from '../../domain/value-objects/channel-type.vo';

describe('ChannelRegisteredDomainEventHandler', () => {
  it('publishes integration event', async () => {
    const publisher = { publish: jest.fn(async () => {}) };
    const handler = new ChannelRegisteredDomainEventHandler(publisher as any);

    const event = new ChannelRegisteredDomainEvent({
      aggregateId: 'ch-1',
      channelType: ChannelTypeVO.create('telegram'),
      channelName: 'My',
      userId: 'user-1',
      connectionConfig: {},
    });

    await handler.handle(event);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it('rethrows when publisher fails', async () => {
    const publisher = { publish: jest.fn(async () => { throw new Error('fail'); }) };
    const handler = new ChannelRegisteredDomainEventHandler(publisher as any);

    const event = new ChannelRegisteredDomainEvent({
      aggregateId: 'ch-1',
      channelType: ChannelTypeVO.create('telegram'),
      channelName: 'My',
      userId: 'user-1',
      connectionConfig: {},
    });

    await expect(handler.handle(event)).rejects.toThrow();
  });
});
