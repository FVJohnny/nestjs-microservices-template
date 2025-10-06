import type { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '@libs/nestjs-common';

export interface StoreTokensCommandProps {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export class StoreTokens_Command extends BaseCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {
    super();
  }
}
