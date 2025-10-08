import { DateVO, type IValueObject } from '../../../general';

export class InboxReceivedAt extends DateVO implements IValueObject<Date> {
  static now(): InboxReceivedAt {
    return new InboxReceivedAt(new Date());
  }

  static random(): InboxReceivedAt {
    const randomDate = new Date(Date.now() - Math.random() * 86400000 * 30); // Random date within last 30 days
    return new InboxReceivedAt(randomDate);
  }
}
