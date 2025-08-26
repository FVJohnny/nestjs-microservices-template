import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RegisterChannelCommand } from './register-channel.command';
import { Channel } from '../../../domain/entities/channel.entity';
import type { ChannelRepository } from '../../../domain/repositories/channel.repository';
import { CorrelationLogger } from '@libs/nestjs-common';

@CommandHandler(RegisterChannelCommand)
export class RegisterChannelCommandHandler
  implements ICommandHandler<RegisterChannelCommand>
{
  private readonly logger = new CorrelationLogger(
    RegisterChannelCommandHandler.name,
  );

  constructor(
    @Inject('ChannelRepository')
    private readonly channelRepository: ChannelRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: RegisterChannelCommand,
  ): Promise<RegisterChannelCommandHandlerResult> {
    this.logger.log('Registering channel...');
    const { channelType, name, userId, connectionConfig } = command;

    // Create the channel aggregate
    const channel = Channel.create({
      channelType,
      name,
      userId,
      connectionConfig,
    });

    // Save the channel
    await this.channelRepository.save(channel);

    // Publish domain events
    const events = channel.getUncommittedEvents();
    this.eventBus.publishAll(events);
    channel.commit();

    return { id: channel.id };
  }
}

export type RegisterChannelCommandHandlerResult = {
  id: string;
};
