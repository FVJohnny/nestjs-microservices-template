import { DomainEvent } from '@libs/nestjs-common';

interface UserProfileUpdatedEventPayload {
  userId: string;
  previousFirstName?: string;
  previousLastName?: string;
  firstName?: string;
  lastName?: string;
  occurredOn: Date;
}
export class UserProfileUpdatedEvent extends DomainEvent {
  public readonly previousFirstName?: string;
  public readonly previousLastName?: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly occurredOn: Date;

  constructor(
    payload: UserProfileUpdatedEventPayload,
  ) {
    super(payload.userId);

    this.previousFirstName = payload.previousFirstName;
    this.previousLastName = payload.previousLastName;
    this.firstName = payload.firstName;
    this.lastName = payload.lastName;
    this.occurredOn = payload.occurredOn;
  }

}