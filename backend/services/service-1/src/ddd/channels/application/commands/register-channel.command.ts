import { ICommand } from '@nestjs/cqrs';

export class RegisterChannelCommand implements ICommand {
  constructor(
    public readonly channelType: string,
    public readonly name: string,
    public readonly userId: string,
    public readonly connectionConfig: Record<string, any>,
  ) {}
}
