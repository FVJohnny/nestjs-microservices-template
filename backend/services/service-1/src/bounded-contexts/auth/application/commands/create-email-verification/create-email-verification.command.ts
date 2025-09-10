import type { ICommand } from '@nestjs/cqrs';
import type { TracingMetadataParams } from '@libs/nestjs-common';
import { BaseCommand } from '@libs/nestjs-common';

export class CreateEmailVerificationCommand extends BaseCommand implements ICommand {
  public readonly userId: string;
  public readonly email: string;

  constructor(props: CreateEmailVerificationCommand, metadata?: TracingMetadataParams) {
    super(metadata);
    this.userId = props.userId;
    this.email = props.email;
  }
}

export class CreateEmailVerificationCommandResponse {
  id: string;
  token: string;
}
