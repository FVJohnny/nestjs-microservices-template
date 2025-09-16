import { BaseCommand } from '@libs/nestjs-common';
import type { ICommand } from '@nestjs/cqrs';
import type { TracingMetadata } from '@libs/nestjs-common';

export class RecordUserLogin_Command extends BaseCommand implements ICommand {
  public readonly userId: string;

  constructor(props: RecordUserLogin_Command, metadata?: TracingMetadata) {
    super(metadata);
    Object.assign(this, props);
  }
}
