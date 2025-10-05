import type { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '@libs/nestjs-common';

export interface RequestPasswordResetCommandProps {
  email: string;
}

export class RequestPasswordReset_Command extends BaseCommand implements ICommand {
  public readonly email: string;

  constructor(props: RequestPasswordResetCommandProps) {
    super();
    this.email = props.email;
  }
}
