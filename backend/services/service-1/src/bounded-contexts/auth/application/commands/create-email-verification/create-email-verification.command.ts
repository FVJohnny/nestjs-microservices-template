import type { ICommand } from '@nestjs/cqrs';
import { Base_Command } from '@libs/nestjs-common';

export class CreateEmailVerification_Command extends Base_Command implements ICommand {
  public readonly userId: string;
  public readonly email: string;

  constructor(props: CreateEmailVerification_Command) {
    super();
    this.userId = props.userId;
    this.email = props.email;
  }
}
