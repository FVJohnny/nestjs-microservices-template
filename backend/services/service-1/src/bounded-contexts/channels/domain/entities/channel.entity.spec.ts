import { Channel } from './channel.entity';
import { ChannelTypeVO } from '../value-objects/channel-type.vo';
import { ChannelRegisteredDomainEvent } from '../events/channel-registered.domain-event';
import { MessageReceivedDomainEvent } from '../events/message-received.domain-event';
import { InvalidOperationException } from '@libs/nestjs-common';

describe('Channel (domain)', () => {
  it('create() raises ChannelRegisteredDomainEvent', () => {
    const channel = Channel.create('telegram', 'My Channel', 'user-1', { token: 'abc' });
    const events = channel.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0]).toBeInstanceOf(ChannelRegisteredDomainEvent);
  });

  it('receiveMessage() raises MessageReceivedDomainEvent', () => {
    const channel = Channel.create('telegram', 'My Channel', 'user-1', { token: 'abc' });
    channel.receiveMessage('msg-1', 'hello', 'sender-1', 'Sender');
    const events = channel.getUncommittedEvents();
    expect(events.some((e) => e instanceof MessageReceivedDomainEvent)).toBe(true);
    expect(events.length).toBe(2);
  });

  it('commit() clears uncommitted events', () => {
    const channel = Channel.create('telegram', 'My Channel', 'user-1', {});
    expect(channel.getUncommittedEvents().length).toBe(1);
    channel.commit();
    expect(channel.getUncommittedEvents().length).toBe(0);
  });

  it('receiveMessage() on inactive channel throws', () => {
    const channel = new Channel(
      'id-1',
      ChannelTypeVO.create('telegram'),
      'My Channel',
      'user-1',
      {},
      false,
      new Date(),
    );
    expect(() => channel.receiveMessage('m', 'c', 's', 'sn')).toThrow(InvalidOperationException);
  });
});
