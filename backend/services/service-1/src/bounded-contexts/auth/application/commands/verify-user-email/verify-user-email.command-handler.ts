import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CorrelationLogger, Id, NotFoundException } from '@libs/nestjs-common';
import { VerifyUserEmail_Command } from './verify-user-email.command';
import {
  USER_REPOSITORY,
  type User_Repository,
} from '@bc/auth/domain/aggregates/user/user.repository';

@CommandHandler(VerifyUserEmail_Command)
export class VerifyUserEmail_CommandHandler
  implements ICommandHandler<VerifyUserEmail_Command>
{
  private readonly logger = new CorrelationLogger(VerifyUserEmail_CommandHandler.name);

  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: User_Repository) {}

  async execute(command: VerifyUserEmail_Command): Promise<void> {
    this.logger.log(`Executing command: VerifyUserEmail_Command for user: ${command.userId}`);

    const userId = new Id(command.userId);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('userId', command.userId);
    }

    user.verifyEmail();
    await this.userRepository.save(user);

    this.logger.log(`User ${user.id.toValue()} email verification completed`);
  }
}
