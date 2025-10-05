import type { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '@libs/nestjs-common';

export class Logout_Command extends BaseCommand implements ICommand {
  public readonly userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }
}
