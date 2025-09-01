import { ICommand } from '@nestjs/cqrs';
import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;
}