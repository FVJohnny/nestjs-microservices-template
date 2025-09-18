import type { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '@libs/nestjs-common';

export class VerifyEmail_Command extends BaseCommand implements ICommand {
  public readonly emailVerificationId: string;

  constructor(props: VerifyEmail_Command) {
    super();
    this.emailVerificationId = props.emailVerificationId;
  }
}
