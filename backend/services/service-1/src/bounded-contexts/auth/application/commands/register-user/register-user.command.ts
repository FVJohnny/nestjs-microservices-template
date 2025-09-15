import type { ICommand } from '@nestjs/cqrs';
import type { TracingMetadataParams } from '@libs/nestjs-common';
import { BaseCommand } from '@libs/nestjs-common';

export class RegisterUserCommand extends BaseCommand implements ICommand {
  public readonly email: string;
  public readonly username: string;
  public readonly password: string;
  public readonly role: string;

  constructor(props: RegisterUserCommand, metadata?: TracingMetadataParams) {
    super(metadata);
    this.email = props.email;
    this.username = props.username;
    this.password = props.password;
    this.role = props.role;
  }
}
