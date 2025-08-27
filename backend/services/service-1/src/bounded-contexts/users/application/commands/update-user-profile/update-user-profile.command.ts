import { ICommand } from '@nestjs/cqrs';

export class UpdateUserProfileCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly metadata?: Record<string, any>,
  ) {}
}