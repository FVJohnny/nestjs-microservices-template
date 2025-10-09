import type { ICommand } from '@nestjs/cqrs';
import { Base_Command } from '@libs/nestjs-common';

export interface RegisterUserCommandProps {
  email: string;
  username: string;
  password: string;
}

export class RegisterUser_Command extends Base_Command implements ICommand {
  public readonly email: string;
  public readonly username: string;
  public readonly password: string;

  constructor(props: RegisterUserCommandProps) {
    super();
    this.email = props.email;
    this.username = props.username;
    this.password = props.password;
  }
}
