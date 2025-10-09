import { type IEventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ExecutePasswordReset_Command } from './execute-password-reset.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/repositories/user/user.repository';
import {
  PASSWORD_RESET_REPOSITORY,
  type PasswordReset_Repository,
} from '@bc/auth/domain/repositories/password-reset/password-reset.repository';
import { Password } from '@bc/auth/domain/value-objects';
import {
  Base_CommandHandler,
  EVENT_BUS,
  Id,
  NotFoundException,
  InvalidOperationException,
  Transaction,
} from '@libs/nestjs-common';

export class ExecutePasswordReset_CommandHandler extends Base_CommandHandler(
  ExecutePasswordReset_Command,
) {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: User_Repository,
    @Inject(PASSWORD_RESET_REPOSITORY)
    private readonly passwordResetRepository: PasswordReset_Repository,
    @Inject(EVENT_BUS)
    eventBus: IEventBus,
  ) {
    super(eventBus);
  }

  async handle(command: ExecutePasswordReset_Command) {
    const passwordResetId = new Id(command.passwordResetId);

    // Find the password reset
    const passwordReset = await this.passwordResetRepository.findById(passwordResetId);
    if (!passwordReset) {
      throw new NotFoundException('PasswordReset', command.passwordResetId);
    }

    // Validate the password reset is still valid
    if (!passwordReset.isValid()) {
      throw new InvalidOperationException(
        'execute password reset',
        passwordReset.isExpired() ? 'expired' : 'already used',
      );
    }

    // Find the user by email
    const user = await this.userRepository.findByEmail(passwordReset.email);
    if (!user) {
      throw new NotFoundException('User', passwordReset.email.toValue());
    }

    // Create the new password and change it
    const newPassword = await Password.createFromPlainText(command.newPassword);
    user.changePassword(newPassword);

    // Update user password and mark password reset as used in a transaction
    await Transaction.run(async (context) => {
      passwordReset.markAsUsed();

      await this.userRepository.save(user, context);
      await this.passwordResetRepository.save(passwordReset, context);
      await this.sendDomainEvents(user);
    });
  }

  async authorize(_command: ExecutePasswordReset_Command) {
    return true;
  }

  async validate(_command: ExecutePasswordReset_Command) {}
}
