import { CompositeValueObject } from '@libs/nestjs-common';
import { Name } from './name.vo';

type UserProfilePrimitives = {
  firstName: string;
  lastName: string;
};

export class UserProfile extends CompositeValueObject<UserProfilePrimitives> {

  constructor(
    public readonly firstName: Name,
    public readonly lastName: Name,
  ) {
    super();
  }

  static empty(): UserProfile {
    return new UserProfile(
      Name.empty(),
      Name.empty(),
    );
  }

  toValue() {
    return {
      firstName: this.firstName.toValue(),
      lastName: this.lastName.toValue()
    };
  }

  getFullName(): string {
    const first = this.firstName.toValue();
    const last = this.lastName.toValue();
    
    if (!first && !last) return '';
    if (!first) return last;
    if (!last) return first;
    
    return `${first} ${last}`;
  }
}