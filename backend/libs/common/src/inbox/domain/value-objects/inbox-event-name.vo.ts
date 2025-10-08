import { StringValueObject, type IValueObject } from '../../../general';

export class InboxEventName extends StringValueObject implements IValueObject<string> {
  validate(): void {
    super.validate();
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('InboxEventName cannot be empty');
    }
  }

  static random(): InboxEventName {
    const eventNames = ['UserCreated', 'OrderProcessed', 'PaymentCompleted', 'ProductUpdated'];
    const randomName = eventNames[Math.floor(Math.random() * eventNames.length)];
    return new InboxEventName(`${randomName}_IntegrationEvent`);
  }
}
