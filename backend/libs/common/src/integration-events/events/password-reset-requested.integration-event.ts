import { ApplicationException } from '../../errors';
import { BaseIntegrationEvent, type BaseIntegrationEventProps } from './base.integration-event';
import { Topics } from './topics';

interface PasswordResetRequested_IntegrationEventProps extends BaseIntegrationEventProps {
  email: string;
  passwordResetId: string;
  expiresAt: Date;
}

export class PasswordResetRequested_IntegrationEvent extends BaseIntegrationEvent {
  static readonly version = '1.0';
  static readonly name = Topics.USERS.events.PASSWORD_RESET_REQUESTED;
  static readonly topic = Topics.USERS.topic;

  public readonly email: string;
  public readonly passwordResetId: string;
  public readonly expiresAt: Date;

  constructor(props: PasswordResetRequested_IntegrationEventProps) {
    super(props);

    this.email = props.email;
    this.passwordResetId = props.passwordResetId;
    this.expiresAt = props.expiresAt;

    this.validate();
  }

  protected toEventJSON(): Record<string, unknown> {
    return {
      topic: PasswordResetRequested_IntegrationEvent.topic,
      name: PasswordResetRequested_IntegrationEvent.name,
      version: PasswordResetRequested_IntegrationEvent.version,

      email: this.email,
      passwordResetId: this.passwordResetId,
      expiresAt: this.expiresAt.toISOString(),
    };
  }

  static fromJSON(json: Record<string, unknown>): PasswordResetRequested_IntegrationEvent {
    const event = new PasswordResetRequested_IntegrationEvent({
      id: json.id as string,
      occurredOn: json.occurredOn ? new Date(json.occurredOn as string) : undefined,

      email: json.email as string,
      passwordResetId: json.passwordResetId as string,
      expiresAt: new Date(json.expiresAt as string),
    });

    return event;
  }

  protected validate(): void {
    super.validate();
    if (!this.email) throw new ApplicationException('email is required');
    if (!this.passwordResetId) throw new ApplicationException('passwordResetId is required');
    if (!this.expiresAt) throw new ApplicationException('expiresAt is required');
  }
}
