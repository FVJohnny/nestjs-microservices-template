import { ChannelTypeVO, ChannelType } from './channel-type.vo';
import { InvalidChannelTypeError } from '../errors';

describe('ChannelTypeVO', () => {
  it('creates for valid channel types', () => {
    const valid = [
      ChannelType.TELEGRAM,
      ChannelType.DISCORD,
      ChannelType.WHATSAPP,
    ];
    for (const v of valid) {
      const vo = ChannelTypeVO.create(v);
      expect(vo.getValue()).toBe(v);
      expect(vo.toString()).toBe(v);
    }
  });

  it('throws error for invalid channel type', () => {
    expect(() => ChannelTypeVO.create('invalid-type')).toThrow(
      InvalidChannelTypeError,
    );
  });

  it('equality works', () => {
    const a = ChannelTypeVO.create('telegram');
    const b = ChannelTypeVO.create('telegram');
    const c = ChannelTypeVO.create('discord');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
