import type { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '../../../../cqrs/command.base';

export class StoreTokens_Command extends BaseCommand implements ICommand {
  public readonly userId: string;
  public readonly accessToken: string;
  public readonly refreshToken: string;

  constructor(props: StoreTokens_Command) {
    super();
    Object.assign(this, props);
  }
}
