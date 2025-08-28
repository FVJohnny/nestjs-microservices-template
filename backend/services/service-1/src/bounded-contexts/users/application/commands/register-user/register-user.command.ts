import { ICommand } from '@nestjs/cqrs';
import { UserRoleEnum } from '../../../domain/value-objects/user-role.vo';

export class RegisterUserCommand implements ICommand {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly roles?: UserRoleEnum[],
  ) {}
}