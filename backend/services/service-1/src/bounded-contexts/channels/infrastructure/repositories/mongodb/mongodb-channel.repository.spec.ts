import { MongoDBChannelRepository } from './mongodb-channel.repository';
import { Channel } from '../../../domain/entities/channel.entity';
import { ChannelPersistenceException } from '../../errors';

// Minimal doc shape used by repository mapping
const doc = (overrides: Partial<any> = {}) => ({
  id: 'id-1',
  channelType: 'telegram',
  name: 'c1',
  userId: 'u1',
  connectionConfig: {},
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('MongoDBChannelRepository', () => {
  const makeModel = () => ({
    findOne: jest.fn(),
    updateOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  });

  it('save() creates new when not existing', async () => {
    const model = makeModel();
    (model.findOne as jest.Mock).mockResolvedValueOnce(null); // no existing
    (model.create as jest.Mock).mockResolvedValueOnce(undefined);

    const repo = new MongoDBChannelRepository(model as any);
    const ch = Channel.random();

    const res = await repo.save(ch);
    expect(res.id).toBe(ch.id);

    expect(model.create).toHaveBeenCalledTimes(1);
    const arg = (model.create as jest.Mock).mock.calls[0][0];
    expect(arg).toEqual(
      expect.objectContaining({
        id: ch.id,
        name: ch.name,
        channelType: 'telegram',
        userId: ch.userId,
        connectionConfig: ch.connectionConfig,
        isActive: ch.isActive,
        createdAt: ch.createdAt,
      }),
    );
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('save() updates when existing found', async () => {
    const model = makeModel();
    (model.findOne as jest.Mock).mockResolvedValueOnce(doc());
    (model.updateOne as jest.Mock).mockResolvedValueOnce({ matchedCount: 1 });

    const repo = new MongoDBChannelRepository(model as any);
    const ch = Channel.random();

    await repo.save(ch);

    expect(model.updateOne).toHaveBeenCalledWith(
      { id: ch.id },
      expect.objectContaining({
        name: ch.name,
        channelType: ch.channelType.getValue(),
        userId: ch.userId,
        connectionConfig: ch.connectionConfig,
        isActive: ch.isActive,
        updatedAt: expect.any(Date),
      }),
    );
    expect(model.create).not.toHaveBeenCalled();
  });

  it('findById returns mapped Channel or null', async () => {
    const model = makeModel();
    (model.findOne as jest.Mock).mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(doc({ id: 'X' })) });
    const repo = new MongoDBChannelRepository(model as any);

    const found = await repo.findById('X');
    expect(found?.id).toBe('X');

    (model.findOne as jest.Mock).mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
    expect(await repo.findById('missing')).toBeNull();
  });

  it('findByUserId chains find().sort().exec()', async () => {
    const model = makeModel();
    const chain = { sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([doc({ id: 'A', userId: 'u1' })]) };
    (model.find as jest.Mock).mockReturnValueOnce(chain);

    const repo = new MongoDBChannelRepository(model as any);
    const list = await repo.findByUserId('u1');
    expect(model.find).toHaveBeenCalledWith({ userId: 'u1', isActive: true });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(list[0].id).toBe('A');
  });

  it('findAll returns mapped list', async () => {
    const model = makeModel();
    const chain = { sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([doc({ id: 'B' })]) };
    (model.find as jest.Mock).mockReturnValueOnce(chain);

    const repo = new MongoDBChannelRepository(model as any);
    const list = await repo.findAll();
    expect(model.find).toHaveBeenCalledWith({ isActive: true });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(list[0].id).toBe('B');
  });

  it('remove soft-deletes; throws ChannelPersistenceException when not found', async () => {
    const model = makeModel();
    (model.updateOne as jest.Mock).mockResolvedValueOnce({ matchedCount: 1 });
    const repo = new MongoDBChannelRepository(model as any);

    await expect(repo.remove('ok')).resolves.toBeUndefined();

    (model.updateOne as jest.Mock).mockResolvedValueOnce({ matchedCount: 0 });
    await expect(repo.remove('missing')).rejects.toBeInstanceOf(ChannelPersistenceException);
  });

  it('exists uses countDocuments', async () => {
    const model = makeModel();
    (model.countDocuments as jest.Mock).mockResolvedValueOnce(1);
    const repo = new MongoDBChannelRepository(model as any);
    await expect(repo.exists('id')).resolves.toBe(true);

    (model.countDocuments as jest.Mock).mockResolvedValueOnce(0);
    await expect(repo.exists('id')).resolves.toBe(false);
  });

  it('count returns number of active docs', async () => {
    const model = makeModel();
    (model.countDocuments as jest.Mock).mockResolvedValueOnce(42);
    const repo = new MongoDBChannelRepository(model as any);
    await expect(repo.count()).resolves.toBe(42);
  });

  it('wraps model errors in ChannelPersistenceException', async () => {
    const model = makeModel();
    (model.findOne as jest.Mock).mockReturnValueOnce({ exec: jest.fn().mockRejectedValue(new Error('boom')) });
    const repo = new MongoDBChannelRepository(model as any);
    await expect(repo.findById('x')).rejects.toBeInstanceOf(ChannelPersistenceException);
  });
});
