import { Provider, Type } from "@nestjs/common";
import { ICommandHandler, AggregateRoot, CqrsModule, EventBus, IEventHandler } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";
import { Repository, EVENT_PUBLISHER_TOKEN, EventPublisher } from "@libs/nestjs-common";

// Enhanced EventBus interface with events tracking
interface TestEventBus extends EventBus {
  events: any[];
}

// Enhanced EventPublisher interface with events tracking
interface TestEventPublisherInterface extends EventPublisher {
  events: any[];
}

// Test implementation of EventPublisher
export class TestEventPublisher implements TestEventPublisherInterface {
  constructor(private readonly shouldFail: boolean) {}
  
  public readonly events: any[] = [];
  
  async publish(topic: string, message: any): Promise<void> {
    if (this.shouldFail) {
      throw new Error("error test");
    }

    console.log(`Published Integration Event on Topic ${topic}.`);
    this.events.push(message);
  }

  async publishBatch(topic: string, messages: any[]): Promise<void> {
    if (this.shouldFail) {
      throw new Error("error test");
    }
    messages.map(msg => this.publish(topic, msg));
  }
}

interface CreateCQRSTestingModuleOptions {
  commands?: {
    commandHandler: Type<ICommandHandler>,
  },
  events?: {
    eventHandler?: Type<IEventHandler>,
    shouldDomainEventPublishFail: boolean;
  },
  repositories?: {
    name: string,
    repository: Type<Repository<AggregateRoot>>
  }
}

export async function createTestingModule(options: CreateCQRSTestingModuleOptions) {
  
  const commandHandlerOptions = options.commands?.commandHandler;
  const eventHandlerOptions = options.events?.eventHandler;
  const repositoryOptions = options.repositories;

  const providers: Provider[] = [];
  if (commandHandlerOptions) providers.push(commandHandlerOptions);
  if (eventHandlerOptions) {
    providers.push(eventHandlerOptions);
    // Provide TestEventPublisher for EVENT_PUBLISHER_TOKEN when event handler is defined
    const shouldFail = options.events?.shouldDomainEventPublishFail ?? false;
    providers.push({
      provide: EVENT_PUBLISHER_TOKEN,
      useFactory: () => new TestEventPublisher(shouldFail),
    });
  }
  if (repositoryOptions) providers.push({ provide: repositoryOptions.name, useClass: repositoryOptions.repository });

  const builder = Test.createTestingModule({
    imports: [CqrsModule],
    providers: [...providers],
  });

  const moduleRef = await builder.compile();
  await moduleRef.init();

  const commandHandler = commandHandlerOptions && moduleRef.get<ICommandHandler>(commandHandlerOptions);
  const eventHandler = eventHandlerOptions && moduleRef.get<IEventHandler>(eventHandlerOptions);
  const eventPublisher = eventHandlerOptions && moduleRef.get<EventPublisher>(EVENT_PUBLISHER_TOKEN);
  const repository = repositoryOptions && moduleRef.get<Repository<AggregateRoot>>(repositoryOptions.name);
  const eventBus = moduleRef.get(EventBus);
  
  // Track events
  const events: any[] = [];
  (eventBus as any).events = events;
  
  // Store original methods
  const originalPublish = eventBus.publish.bind(eventBus);
  const originalPublishAll = eventBus.publishAll.bind(eventBus);
  
  // Override methods to track events
  if (options.events?.shouldDomainEventPublishFail) {
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

  return { 
    eventBus: eventBus as TestEventBus, 
    commandHandler, 
    eventHandler, 
    eventPublisher: eventPublisher as TestEventPublisherInterface,
    repository 
  };
}