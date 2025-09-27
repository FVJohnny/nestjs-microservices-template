import { StringValueObject } from '../../../general';

export class InboxEventName extends StringValueObject {
  protected ensureIsValid(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('InboxEventName cannot be empty');
    }
  }

  static random(): InboxEventName {
    const eventNames = ['UserCreated', 'OrderProcessed', 'PaymentCompleted', 'ProductUpdated'];
    const randomName = eventNames[Math.floor(Math.random() * eventNames.length)];
    return new InboxEventName(`${randomName}_IntegrationEvent`);
  }
}
