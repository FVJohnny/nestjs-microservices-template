import { Provider, Type, DynamicModule } from "@nestjs/common";
import { ICommandHandler, AggregateRoot, IEventHandler, EventBus } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";
import { DomainEvent, EVENT_PUBLISHER_TOKEN, EventPublisher, Repository } from "../ddd";

interface CreateCQRSTestingModuleOptions {
  imports?: DynamicModule | Type<any> | any[],  // Optional CqrsModule from the consumer
  commands?: {
    commandHandler: Type<ICommandHandler>,
  },
  events?: {
    eventHandler?: Type<IEventHandler>,
    shouldDomainEventPublishFail?: boolean;
  },
  repositories?: {
    name: string,
    repository: Type<Repository<AggregateRoot>>
  }
}

export async function createTestingModule(options: CreateCQRSTestingModuleOptions) {
    const providers: Provider[] = [];

    const optionsCommandHandler = options.commands?.commandHandler;
    const optionsEventHandler = options.events?.eventHandler;
    
    // Command handler
    if (optionsCommandHandler) {
        providers.push(optionsCommandHandler);
    }
    
    // Event handler
    if (optionsEventHandler) {
        const shouldFail = options.events?.shouldDomainEventPublishFail ?? false;
        providers.push({
            provide: EVENT_PUBLISHER_TOKEN,
            useFactory: () => new TestEventPublisher(shouldFail),
        });
        providers.push(optionsEventHandler);
    }

    // Repository
    if (options.repositories) {
        providers.push({ provide: options.repositories.name, useClass: options.repositories.repository })
    }
  
  const importsToUse = options.imports ? (Array.isArray(options.imports) ? options.imports : [options.imports]) : [];
  
  const builder = Test.createTestingModule({
    imports: importsToUse,
    providers: providers,
  });
  
  const moduleRef = await builder.compile();

  await moduleRef.init();

  const commandHandler = optionsCommandHandler && moduleRef.get(optionsCommandHandler);
  const eventHandler = optionsEventHandler && moduleRef.get(optionsEventHandler);
  const eventPublisher = optionsEventHandler && moduleRef.get(EVENT_PUBLISHER_TOKEN);
  const repository = options.repositories && moduleRef.get<Repository<AggregateRoot>>(options.repositories.name);
  
  // Get the EventBus from the module and enhance it with tracking
  const eventBus = moduleRef.get(EventBus);
  
  // Track events by adding an array property
  const events: DomainEvent[] = [];
  (eventBus as any).events = events;
  
  // Store original methods
  const originalPublish = eventBus.publish.bind(eventBus);
  const originalPublishAll = eventBus.publishAll.bind(eventBus);
  
  // Override methods to track events
  if (options.events?.shouldDomainEventPublishFail) {
    eventBus.publish = () => { throw new Error("error test"); };
    eventBus.publishAll = () => { throw new Error("error test"); };
  } else {
    eventBus.publish = function(event: DomainEvent) {
      console.log("TEST Publishing event", event);
      events.push(event);
      return originalPublish(event);
    };
    
    eventBus.publishAll = function(eventsArray: DomainEvent[]) {
      eventsArray.forEach(ev => {
        console.log("TEST Publishing event", ev);
        events.push(ev);
      });
      return originalPublishAll(eventsArray);
    };
  }
  
  return { eventBus, commandHandler, eventHandler, eventPublisher, repository };
}

export class TestEventPublisher implements EventPublisher {
    constructor(private readonly shouldFail: boolean) {}
    
    public readonly events: any[] = [];
    
    async publish(topic: string, message: any): Promise<void> {
      if (this.shouldFail) {
        throw Error("error test")
      }

      console.log(`Published Integration Event on Topic ${topic}.`)
      this.events.push(message)
    }
  
    async publishBatch(topic: string, messages: any[]): Promise<void> {
        if (this.shouldFail) {
            throw Error("error test")
        }
        messages.map(msg => this.publish(topic, msg))
    }
}