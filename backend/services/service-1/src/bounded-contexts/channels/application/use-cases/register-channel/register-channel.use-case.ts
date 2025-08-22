import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CorrelationLogger, UseCase, UseCaseHandler } from '@libs/nestjs-common';
import { RegisterChannelCommand } from '../../commands/register-channel/register-channel.command';
import { CountUserChannelsQuery } from '../../queries/count-user-channels/count-user-channels.query';
import { FindChannelByUserAndNameQuery } from '../../queries/find-channel-by-user-and-name/find-channel-by-user-and-name.query';
import {
  RegisterChannelRequest,
  RegisterChannelResponse,
  UserNotFoundError,
  TooManyChannelsError,
  DuplicateChannelNameError,
} from './register-channel.request-response';

export interface RegisterChannelUseCase 
  extends UseCase<RegisterChannelRequest, RegisterChannelResponse> {}

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
    request: RegisterChannelRequest,
  ): Promise<RegisterChannelResponse> {
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

    // 3. Handle any post-processing side effects
    await this.handleSideEffects(request, result);

    this.logger.log(
      `Successfully registered channel ${result.id} for user ${request.userId}`,
    );

    return {
      channelId: result.id,
      success: true,
    };
  }

  private async validateBusinessRules(
    request: RegisterChannelRequest,
  ): Promise<void> {
    // Business rule: User must exist (cross-bounded-context validation)
    // const userExists = await this.queryBus.execute(
    //   new UserExistsQuery(request.userId)
    // );
    // if (!userExists) {
    //   this.logger.warn(
    //     `Registration failed: User ${request.userId} does not exist`,
    //   );
    //   throw new UserNotFoundError(request.userId);
    // }

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

  private async handleSideEffects(
    request: RegisterChannelRequest,
    result: { id: string },
  ): Promise<void> {
    // Future: This is where we could add cross-bounded-context side effects like:
    // - Updating user's last activity timestamp
    // - Sending notifications
    // - Recording analytics events
    // - Updating quotas or usage tracking

    // For now, just log the successful creation
    this.logger.log(
      `Channel ${result.id} created successfully for user ${request.userId}`,
    );

    // Example future side effect:
    // this.eventBus.publish(new UserActivityRecordedEvent({
    //   userId: request.userId,
    //   activity: 'channel_created',
    //   channelId: result.id,
    //   timestamp: new Date()
    // }));
  }
}
