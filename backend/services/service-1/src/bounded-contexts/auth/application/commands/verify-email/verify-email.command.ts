import type { ICommand } from '@nestjs/cqrs';
import type { TracingMetadata } from '@libs/nestjs-common';
import { BaseCommand } from '@libs/nestjs-common';

export class VerifyEmail_Command extends BaseCommand implements ICommand {
  public readonly emailVerificationId: string;

  constructor(props: VerifyEmail_Command, metadata?: TracingMetadata) {
    super(metadata);
    this.emailVerificationId = props.emailVerificationId;
  }
}
