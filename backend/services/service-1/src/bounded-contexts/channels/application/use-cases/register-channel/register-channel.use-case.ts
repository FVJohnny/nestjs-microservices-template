import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CorrelationLogger, UseCase, UseCaseHandler } from '@libs/nestjs-common';
import { RegisterChannelCommand } from '../../commands/register-channel/register-channel.command';
import { CountUserChannelsQuery } from '../../queries/count-user-channels/count-user-channels.query';
import { FindChannelByUserAndNameQuery } from '../../queries/find-channel-by-user-and-name/find-channel-by-user-and-name.query';
import {
  RegisterChannelUseCaseProps,
  RegisterChannelUseCaseResponse,
  UserNotFoundError,
  TooManyChannelsError,
  DuplicateChannelNameError,
} from './register-channel.request-response';

export interface RegisterChannelUseCase 
  extends UseCase<RegisterChannelUseCaseProps, RegisterChannelUseCaseResponse> {}

@Injectable()
@UseCaseHandler({
  name: 'RegisterChannel',
  description: 'Registers a new channel with comprehensive business rule validation',
  category: 'channels',
  trackPerformance: true,
})
export class RegisterChannelUseCaseImpl implements RegisterChannelUseCase {
  private readonly logger = new CorrelationLogger(
    RegisterChannelUseCaseImpl.name,
  );

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(
    request: RegisterChannelUseCaseProps,
  ): Promise<RegisterChannelUseCaseResponse> {
    this.logger.log(
      `Executing RegisterChannel use case for user ${request.userId}`,
    );

    // 1. Cross-bounded-context and business rule validations
    await this.validateBusinessRules(request);

    // 2. Execute the domain command
    const command = new RegisterChannelCommand({
      channelType: request.channelType,
      name: request.name,
      userId: request.userId,
      connectionConfig: request.connectionConfig,
    });

    const result = await this.commandBus.execute(command);

    this.logger.log(
      `Successfully registered channel ${result.id} for user ${request.userId}`,
    );

    return {
      channelId: result.id,
      success: true,
    };
  }

  private async validateBusinessRules(
    request: RegisterChannelUseCaseProps,
  ): Promise<void> {
    // Business rule: User must exist

    // Business rule: User can't have more than 10 channels
    const userChannelCount = await this.queryBus.execute(
      new CountUserChannelsQuery(request.userId)
    );
    if (userChannelCount >= 10) {
      this.logger.warn(
        `Registration failed: User ${request.userId} has ${userChannelCount} channels (limit: 10)`,
      );
      throw new TooManyChannelsError(request.userId);
    }

    // Business rule: Channel name must be unique per user
    const existingChannel = await this.queryBus.execute(
      new FindChannelByUserAndNameQuery(request.userId, request.name)
    );
    if (existingChannel) {
      this.logger.warn(
        `Registration failed: Channel name '${request.name}' already exists for user ${request.userId}`,
      );
      throw new DuplicateChannelNameError(
        `Channel name '${request.name}' already exists for this user`,
      );
    }

    this.logger.log(
      `Business rules validation passed for user ${request.userId}`,
    );
  }
}
