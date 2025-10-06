import type { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '@libs/nestjs-common';

export class RevokeAllUserTokens_Command extends BaseCommand implements ICommand {
  constructor(public readonly userId: string) {
    super();
  }
}
