import type { ICommand } from '@nestjs/cqrs';
import type { TracingMetadataParams } from '@libs/nestjs-common';
import { BaseCommand } from '@libs/nestjs-common';

export class VerifyEmailCommand extends BaseCommand implements ICommand {
  public readonly token: string;

  constructor(props: VerifyEmailCommand, metadata?: TracingMetadataParams) {
    super(metadata);
    this.token = props.token;
  }
}

export class VerifyEmailCommandResponse {
  success: boolean;
  userId: string;
}
