import type { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '@libs/nestjs-common';

export class DeleteEmailVerificationByUserId_Command extends BaseCommand implements ICommand {
  public readonly userId: string;

  constructor(props: DeleteEmailVerificationByUserId_Command) {
    super();
    this.userId = props.userId;
  }
}
