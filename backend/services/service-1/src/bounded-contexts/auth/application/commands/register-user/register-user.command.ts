import type { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '@libs/nestjs-common';

export class RegisterUser_Command extends BaseCommand implements ICommand {
  public readonly email: string;
  public readonly username: string;
  public readonly password: string;
  public readonly role: string;

  constructor(props: RegisterUser_Command) {
    super();
    this.email = props.email;
    this.username = props.username;
    this.password = props.password;
    this.role = props.role;
  }
}
