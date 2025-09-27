import { StringValueObject } from '../../../general';

export class InboxPayload extends StringValueObject {
  protected ensureIsValid(value: string): void {
    if (!value) {
      throw new Error('InboxPayload cannot be null or undefined');
    }
    try {
      JSON.parse(value);
    } catch {
      throw new Error('InboxPayload must be valid JSON');
    }
  }

  static random(): InboxPayload {
    const randomData = {
      id: Math.random().toString(36).substring(2, 15),
      data: `random-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    return new InboxPayload(JSON.stringify(randomData));
  }
}
