import { DomainEvent } from '@libs/nestjs-common';

interface UserProfileUpdatedDomainEventParams {
  userId: string;
  previousFirstName: string;
  previousLastName: string;
  firstName: string;
  lastName: string;
}
export class UserProfileUpdatedDomainEvent extends DomainEvent {
  public readonly previousFirstName: string;
  public readonly previousLastName: string;
  public readonly firstName: string;
  public readonly lastName: string;

  constructor(
    payload: UserProfileUpdatedDomainEventParams,
  ) {
    super(payload.userId);

    this.previousFirstName = payload.previousFirstName;
    this.previousLastName = payload.previousLastName;
    this.firstName = payload.firstName;
    this.lastName = payload.lastName;
  }

}