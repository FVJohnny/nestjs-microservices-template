import { InMemoryChannelRepository } from './in-memory-channel.repository';
import { Channel } from '../../../domain/entities/channel.entity';

describe('InMemoryChannelRepository', () => {
  it('saves and finds by id', async () => {
    const repo = new InMemoryChannelRepository();
    const ch = Channel.random();
    await repo.save(ch);
    const found = await repo.findById(ch.id);
    expect(found?.id).toBe(ch.id);
  });

  it('finds by user and removes', async () => {
    const repo = new InMemoryChannelRepository();
    const userId1 = 'u1';
    const userId2 = 'u2';
    const a = Channel.random({ userId: userId1 });
    const b = Channel.random({ userId: userId2 });

    await repo.save(a);
    await repo.save(b);

    const u1Channels = await repo.findByUserId('u1');
    expect(u1Channels.map((c) => c.id)).toEqual([a.id]);

    await repo.remove(a.id);
    expect(await repo.findById(a.id)).toBeNull();
  });

  it('exists reflects presence', async () => {
    const repo = new InMemoryChannelRepository();
    const ch = Channel.random();
    await repo.save(ch);
    expect(await repo.exists(ch.id)).toBe(true);
    await repo.remove(ch.id);
    expect(await repo.exists(ch.id)).toBe(false);
  });
});
