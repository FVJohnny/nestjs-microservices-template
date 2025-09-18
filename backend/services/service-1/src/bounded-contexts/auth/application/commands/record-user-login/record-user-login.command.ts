import { BaseCommand } from '@libs/nestjs-common';
import type { ICommand } from '@nestjs/cqrs';

export class RecordUserLogin_Command extends BaseCommand implements ICommand {
  public readonly userId: string;

  constructor(props: RecordUserLogin_Command) {
    super();
    Object.assign(this, props);
  }
}
