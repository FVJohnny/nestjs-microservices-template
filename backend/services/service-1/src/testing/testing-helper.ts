import { Provider, Type } from "@nestjs/common";
import { ICommandHandler, AggregateRoot, CqrsModule, EventBus, IEventHandler } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";
import { Repository, EVENT_PUBLISHER_TOKEN, EventPublisher } from "@libs/nestjs-common";

interface TestEventBus extends EventBus {
  events: any[];
}

interface TestEventPublisherInterface extends EventPublisher {
  events: any[];
}

export class TestEventPublisher implements TestEventPublisherInterface {
  public readonly events: any[] = [];
  
  constructor(private readonly shouldFail: boolean) {}
  
  async publish(topic: string, message: any): Promise<void> {
    if (this.shouldFail) throw new Error("error test");
    this.events.push(message);
  }

  async publishBatch(topic: string, messages: any[]): Promise<void> {
    if (this.shouldFail) throw new Error("error test");
    messages.forEach(msg => this.publish(topic, msg));
  }
}

interface CreateCQRSTestingModuleOptions {
  commands?: { commandHandler: Type<ICommandHandler> };
  events?: { 
    eventHandler?: Type<IEventHandler>;
    shouldDomainEventPublishFail: boolean;
  };
  repositories?: {
    name: string;
    repository: Type<Repository<AggregateRoot>>;
  };
}

export async function createTestingModule(options: CreateCQRSTestingModuleOptions) {
  const { commands, events, repositories } = options;
  const shouldFail = events?.shouldDomainEventPublishFail ?? false;

  const providers: Provider[] = [];
  
  if (commands?.commandHandler) providers.push(commands.commandHandler);
  
  if (events?.eventHandler) {
    providers.push(
      events.eventHandler,
      { provide: EVENT_PUBLISHER_TOKEN, useFactory: () => new TestEventPublisher(shouldFail) }
    );
  }
  
  if (repositories) {
    providers.push({ provide: repositories.name, useClass: repositories.repository });
  }

  const moduleRef = await Test.createTestingModule({
    imports: [CqrsModule],
    providers,
  }).compile();
  
  await moduleRef.init();

  const commandHandler = commands?.commandHandler && moduleRef.get<ICommandHandler>(commands.commandHandler);
  const eventHandler = events?.eventHandler && moduleRef.get<IEventHandler>(events.eventHandler);
  const eventPublisher = events?.eventHandler && moduleRef.get<EventPublisher>(EVENT_PUBLISHER_TOKEN);
  const repository = repositories && moduleRef.get<Repository<AggregateRoot>>(repositories.name);
  const eventBus = moduleRef.get(EventBus);
  
  const eventList: any[] = [];
  (eventBus as any).events = eventList;
  
  const originalPublish = eventBus.publish.bind(eventBus);
  const originalPublishAll = eventBus.publishAll.bind(eventBus);
  
  if (shouldFail) {
    eventBus.publish = () => { throw new Error("error test"); };
    eventBus.publishAll = () => { throw new Error("error test"); };
  } else {
    eventBus.publish = (event: any) => {
      eventList.push(event);
      return originalPublish(event);
    };
    
    eventBus.publishAll = (eventsArray: any[]) => {
      eventList.push(...eventsArray);
      return originalPublishAll(eventsArray);
    };
  }

  return { 
    eventBus: eventBus as TestEventBus, 
    commandHandler, 
    eventHandler, 
    eventPublisher: eventPublisher as TestEventPublisherInterface,
    repository 
  };
}