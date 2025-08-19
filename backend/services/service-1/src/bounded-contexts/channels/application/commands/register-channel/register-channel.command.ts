import { ICommand } from '@nestjs/cqrs';

export interface RegisterChannelCommandProps {
  channelType: string;
  name: string;
  userId: string;
  connectionConfig: Record<string, any>;
}

export class RegisterChannelCommand implements ICommand {
  public readonly channelType: string;
  public readonly name: string;
  public readonly userId: string;
  public readonly connectionConfig: Record<string, any>;

  constructor(props: RegisterChannelCommandProps) {
    this.channelType = props.channelType;
    this.name = props.name;
    this.userId = props.userId;
    this.connectionConfig = props.connectionConfig;
  }
}
