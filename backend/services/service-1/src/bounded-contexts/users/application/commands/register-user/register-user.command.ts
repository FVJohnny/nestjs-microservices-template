import { ICommand } from '@nestjs/cqrs';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserCommand implements ICommand {

  public readonly email: string;
  public readonly username: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly roles: string[];

  constructor(props: RegisterUserCommand) {
    Object.assign(this, props);
  }
}

export class RegisterUserCommandResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;
}