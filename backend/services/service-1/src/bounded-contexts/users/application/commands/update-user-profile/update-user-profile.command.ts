import { ICommand } from '@nestjs/cqrs';
import { BaseCommand } from '@libs/nestjs-common';
import { TracingMetadata } from '@libs/nestjs-common';

export class UpdateUserProfileCommand extends BaseCommand implements ICommand {
  public readonly userId: string;
  public readonly firstName: string;
  public readonly lastName: string;

  constructor(
    props: UpdateUserProfileCommand,
    metadata?: TracingMetadata
  ) {
    super(metadata);
    Object.assign(this, props);
  }
}