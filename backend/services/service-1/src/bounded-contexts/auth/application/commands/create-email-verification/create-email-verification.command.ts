import type { ICommand } from '@nestjs/cqrs';
import type { TracingMetadata } from '@libs/nestjs-common';
import { BaseCommand } from '@libs/nestjs-common';

export class CreateEmailVerification_Command extends BaseCommand implements ICommand {
  public readonly userId: string;
  public readonly email: string;

  constructor(props: CreateEmailVerification_Command, metadata?: TracingMetadata) {
    super(metadata);
    this.userId = props.userId;
    this.email = props.email;
  }
}
