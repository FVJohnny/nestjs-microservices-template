import { DomainEvent, Repository, createTestDomainEventTestHandler } from "@libs/nestjs-common";
import { Type } from "@nestjs/common";
import { ICommandHandler, AggregateRoot, CqrsModule, EventBus } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";

interface CreateCQRSTestingModuleOptions {
  commands: {
    commandHandler: Type<ICommandHandler>,
  },
  events: {
    shouldEventPublishFail: boolean;
  },
  repositories: {
    name: string,
    repository: Type<Repository<AggregateRoot>>
  }
}

// TODO: Replace eventbus by something we can keep track of events
export async function createTestingModule(options: CreateCQRSTestingModuleOptions) {
  
  const builder = Test.createTestingModule({
    imports: [CqrsModule],
    providers: [
      options.commands.commandHandler,
      { provide: options.repositories.name, useClass: options.repositories.repository },
    ],
  });

  const moduleRef = await builder.compile();
  await moduleRef.init();

  const commandHandler = moduleRef.get(options.commands.commandHandler);
  const repository = moduleRef.get<Repository<AggregateRoot>>(options.repositories.name);
  const eventBus = moduleRef.get(EventBus)
  if (options.events.shouldEventPublishFail) {
    eventBus.publish = () => {throw new Error("error test")}
    eventBus.publishAll = () => {throw new Error("error test")}
  }

  return { eventBus, commandHandler, repository };
}