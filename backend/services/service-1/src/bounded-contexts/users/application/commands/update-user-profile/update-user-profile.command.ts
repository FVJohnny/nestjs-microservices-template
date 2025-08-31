import { ICommand } from '@nestjs/cqrs';

export class UpdateUserProfileCommand implements ICommand {
  public readonly userId: string;
  public readonly firstName?: string;
  public readonly lastName?: string;

  constructor(
    props: UpdateUserProfileCommand
  ) {
    Object.assign(this, props);
  }
}