import { Type } from "@nestjs/common";
import { ICommandHandler, AggregateRoot, CqrsModule, EventBus } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";
import { Repository } from "@libs/nestjs-common";

interface CreateCQRSTestingModuleOptions {
  commands: {
    commandHandler: Type<ICommandHandler>,
  },
  events: {
    shouldDomainEventPublishFail: boolean;
  },
  repositories: {
    name: string,
    repository: Type<Repository<AggregateRoot>>
  }
}

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
  const eventBus = moduleRef.get(EventBus);
  
  // Track events
  const events: any[] = [];
  (eventBus as any).events = events;
  
  // Store original methods
  const originalPublish = eventBus.publish.bind(eventBus);
  const originalPublishAll = eventBus.publishAll.bind(eventBus);
  
  // Override methods to track events
  if (options.events.shouldDomainEventPublishFail) {
    eventBus.publish = () => { throw new Error("error test"); };
    eventBus.publishAll = () => { throw new Error("error test"); };
  } else {
    eventBus.publish = function(event: any) {
      console.log("TEST Publishing event", event);
      events.push(event);
      return originalPublish(event);
    };
    
    eventBus.publishAll = function(eventsArray: any[]) {
      eventsArray.forEach(ev => {
        console.log("TEST Publishing event", ev);
        events.push(ev);
      });
      return originalPublishAll(eventsArray);
    };
  }

  return { eventBus, commandHandler, repository };
}