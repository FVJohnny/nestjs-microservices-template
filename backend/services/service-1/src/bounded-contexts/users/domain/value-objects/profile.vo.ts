import { DomainValidationException, Primitives } from '@libs/nestjs-common';
import { Name } from './name.vo';

export class Profile {
  public readonly firstName: Name;
  public readonly lastName: Name;

  constructor(firstName: Name, lastName: Name) {
    this.firstName = firstName;
    this.lastName = lastName;
  }

  static empty(): Profile {
    return new Profile(Name.empty(), Name.empty());
  }


  toPrimitives(): Primitives {
    return {
      firstName: this.firstName.toValue(),
      lastName: this.lastName.toValue(),
    };
  }

  static fromPrimitives(data: Primitives): Profile {
    return new Profile(
      data.firstName ? new Name(data.firstName) : Name.empty(),
      data.lastName ? new Name(data.lastName) : Name.empty()
    );
  }

  equals(other: Profile): boolean {
    if (!other) return false;
    
    return this.firstName.equals(other.firstName) && 
           this.lastName.equals(other.lastName);
  }

}