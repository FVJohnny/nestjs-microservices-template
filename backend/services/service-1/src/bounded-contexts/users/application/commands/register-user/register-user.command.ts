import { ICommand } from '@nestjs/cqrs';
import { ApiProperty } from '@nestjs/swagger';
import { BaseCommand, CqrsMetadata } from '@libs/nestjs-common';

interface RegisterUserCommandProps {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export class RegisterUserCommand extends BaseCommand implements ICommand {

  public readonly email: string;
  public readonly username: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly roles: string[];

  constructor(props: RegisterUserCommandProps, metadata?: CqrsMetadata) {
    super(metadata);
    this.email = props.email;
    this.username = props.username;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.roles = props.roles;
  }
}

export class RegisterUserCommandResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;
}