import type { ICommand } from '@nestjs/cqrs';
import type { TracingMetadataParams } from '@libs/nestjs-common';
import { BaseCommand } from '@libs/nestjs-common';

export class VerifyEmailCommand extends BaseCommand implements ICommand {
  public readonly emailVerificationId: string;

  constructor(props: VerifyEmailCommand, metadata?: TracingMetadataParams) {
    super(metadata);
    this.emailVerificationId = props.emailVerificationId;
  }
}

export class VerifyEmailCommandResponse {
  userId: string;
}
