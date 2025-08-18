import { RedisChannelRepository } from './redis-channel.repository';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelPersistenceException } from '../../errors';

describe('RedisChannelRepository', () => {
  const makeRedis = () => ({
    get: jest.fn(),
    set: jest.fn(),
    keys: jest.fn(),
    mget: jest.fn(),
    smembers: jest.fn(),
    sadd: jest.fn(),
    del: jest.fn(),
    srem: jest.fn(),
    exists: jest.fn(),
  });

  it('save writes key and user index', async () => {
    const redis = makeRedis();
    const repo = new RedisChannelRepository(redis as any);

    const ch = Channel.random();
    await repo.save(ch);

    expect(redis.set).toHaveBeenCalledTimes(1);
    expect((redis.set as jest.Mock).mock.calls[0][0]).toBe(`channel:${ch.id}`);
    expect(redis.sadd).toHaveBeenCalledWith(`user_channels:${ch.userId}`, ch.id);
  });

  it('findById returns mapped Channel or null', async () => {
    const redis = makeRedis();
    const repo = new RedisChannelRepository(redis as any);

    const ch = Channel.random();
    (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      id: ch.id,
      channelType: 'telegram',
      name: ch.name,
      userId: ch.userId,
      connectionConfig: ch.connectionConfig,
      isActive: ch.isActive,
      createdAt: ch.createdAt.toISOString(),
    }));

    const found = await repo.findById(ch.id);
    expect(found?.id).toBe(ch.id);

    (redis.get as jest.Mock).mockResolvedValueOnce(null);
    expect(await repo.findById('missing')).toBeNull();
  });

  it('findAll aggregates keys and maps channels', async () => {
    const redis = makeRedis();
    const repo = new RedisChannelRepository(redis as any);

    const c1 = Channel.random();
    const c2 = Channel.random();
    (redis.keys as jest.Mock).mockResolvedValueOnce([`channel:${c1.id}`, `channel:${c2.id}`]);
    (redis.mget as jest.Mock).mockResolvedValueOnce([
      JSON.stringify({ id: c1.id, channelType: 'telegram', name: c1.name, userId: c1.userId, connectionConfig: {}, isActive: true, createdAt: c1.createdAt.toISOString() }),
      JSON.stringify({ id: c2.id, channelType: 'discord', name: c2.name, userId: c2.userId, connectionConfig: {}, isActive: true, createdAt: c2.createdAt.toISOString() }),
    ]);

    const all = await repo.findAll();
    expect(all.map((c) => c.id).sort()).toEqual([c1.id, c2.id].sort());
  });

  it('findByUserId reads set and values', async () => {
    const redis = makeRedis();
    const repo = new RedisChannelRepository(redis as any);

    const ch = Channel.random();
    (redis.smembers as jest.Mock).mockResolvedValueOnce([ch.id]);
    (redis.mget as jest.Mock).mockResolvedValueOnce([
      JSON.stringify({ id: ch.id, channelType: 'telegram', name: ch.name, userId: ch.userId, connectionConfig: {}, isActive: true, createdAt: ch.createdAt.toISOString() }),
    ]);

    const items = await repo.findByUserId('u1');
    expect(items[0].id).toBe(ch.id);
  });

  it('errors are mapped to ChannelPersistenceException', async () => {
    const redis = makeRedis();
    const repo = new RedisChannelRepository(redis as any);
    (redis.get as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(repo.findById('x')).rejects.toBeInstanceOf(ChannelPersistenceException);
  });
});
