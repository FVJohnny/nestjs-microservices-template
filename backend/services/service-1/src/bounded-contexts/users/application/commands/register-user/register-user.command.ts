import { ICommand } from '@nestjs/cqrs';
import { BaseCommand, TracingMetadataParams } from '@libs/nestjs-common';

export class RegisterUserCommand extends BaseCommand implements ICommand {

  public readonly email: string;
  public readonly username: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly role: string;

  constructor(props: RegisterUserCommand, metadata?: TracingMetadataParams) {
    super(metadata);
    this.email = props.email;
    this.username = props.username;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
  }
}

export class RegisterUserCommandResponse {
  id: string;
}