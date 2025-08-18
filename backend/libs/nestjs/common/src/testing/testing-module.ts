import { Type } from "@nestjs/common";
import { Test } from '@nestjs/testing';
import { AggregateRoot, CqrsModule, EventBus, ICommand, ICommandHandler } from "@nestjs/cqrs";
import { createTestDomainEventTestHandler } from "./cqrs-event-handler";
import { Repository } from "../ddd";
import { mockEventBusPublishFailure } from "./cqrs-event-bus";

interface CreateCQRSTestingModuleOptions {
  commands: {
    command: Type<ICommand>,
    commandHandler: Type<ICommandHandler>,
  },
  events: {
    shouldEventPublishFail: boolean;
  },
  repository: {
    name: string,
    repo: Type<Repository<AggregateRoot>>
  }
}
async function createTestingModule(options: CreateCQRSTestingModuleOptions) {
  // ChannelRegisteredDomainTestEventHandler.reset();
  const TestCommandHandler = createTestDomainEventTestHandler(options.commands.command);

  const builder = Test.createTestingModule({
    imports: [CqrsModule],
    providers: [
      options.commands.commandHandler,
      TestCommandHandler,
      { provide: options.repository.name, useClass: options.repository.repo },
    ],
  });

  const moduleRef = await builder.compile();
  await moduleRef.init();

  if (options.events.shouldEventPublishFail) {
    const eventBus = moduleRef.get(EventBus);
    mockEventBusPublishFailure(eventBus, 'fail');
  }

  const handler = moduleRef.get(options.commands.commandHandler);
  const repo = moduleRef.get<Repository<AggregateRoot>>(options.repository.name);
  return { handler, repo, close: () => moduleRef.close() };
}