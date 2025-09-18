import { DateVO } from '../../../general';

export class OutboxCreatedAt extends DateVO {
  constructor(value: Date) {
    super(value);
  }

  static now(): OutboxCreatedAt {
    return new OutboxCreatedAt(new Date());
  }

  static random(): OutboxCreatedAt {
    return new OutboxCreatedAt(DateVO.random().toValue());
  }
}
