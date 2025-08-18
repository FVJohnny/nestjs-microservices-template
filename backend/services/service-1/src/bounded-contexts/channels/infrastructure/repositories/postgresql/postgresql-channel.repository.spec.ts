import { PostgreSQLChannelRepository } from './postgresql-channel.repository';
import { PostgreSQLChannelEntity } from './channel.schema';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelPersistenceException } from '../../errors';

describe('PostgreSQLChannelRepository', () => {
  const makeOrmRepo = () => ({
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  });

  it('save maps domain -> entity', async () => {
    const orm = makeOrmRepo();
    (orm.save as jest.Mock).mockResolvedValue(undefined);
    const repo = new PostgreSQLChannelRepository(orm as any);

    const ch = Channel.create('telegram', 'c1', 'u1', { token: 't' });
    await repo.save(ch);

    expect((orm.save as jest.Mock)).toHaveBeenCalledTimes(1);
    const entityArg = (orm.save as jest.Mock).mock.calls[0][0] as PostgreSQLChannelEntity;
    expect(entityArg.id).toBe(ch.id);
    expect(entityArg.channelType).toBe('telegram');
    expect(entityArg.name).toBe('c1');
    expect(entityArg.userId).toBe('u1');
  });

  it('findById maps entity -> domain', async () => {
    const orm = makeOrmRepo();
    const now = new Date();
    (orm.findOne as jest.Mock).mockResolvedValue({
      id: 'id-1',
      channelType: 'telegram',
      name: 'c1',
      userId: 'u1',
      connectionConfig: {},
      isActive: true,
      createdAt: now,
    });
    const repo = new PostgreSQLChannelRepository(orm as any);

    const found = await repo.findById('id-1');
    expect(found?.id).toBe('id-1');
    expect(found?.channelType.toString()).toBe('telegram');
  });

  it('findAll uses query builder and maps results', async () => {
    const orm = makeOrmRepo();
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 'id-1', channelType: 'telegram', name: 'c1', userId: 'u1', connectionConfig: {}, isActive: true, createdAt: new Date() },
      ]),
    };
    (orm.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const repo = new PostgreSQLChannelRepository(orm as any);
    const all = await repo.findAll();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe('id-1');
    expect(qb.getMany).toHaveBeenCalled();
  });

  it('errors are mapped to ChannelPersistenceException', async () => {
    const orm = makeOrmRepo();
    (orm.count as jest.Mock).mockRejectedValue(new Error('fail'));
    const repo = new PostgreSQLChannelRepository(orm as any);
    await expect(repo.exists('x')).rejects.toBeInstanceOf(ChannelPersistenceException);
  });
});
