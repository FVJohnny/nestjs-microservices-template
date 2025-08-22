import { Provider, Type } from '@nestjs/common';
import {
  ICommandHandler,
  AggregateRoot,
  CqrsModule,
  EventBus,
  IEventHandler,
} from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import {
  Repository,
  INTEGRATION_EVENT_PUBLISHER_TOKEN,
  IntegrationEventPublisher,
} from '@libs/nestjs-common';

interface TestEventBus extends EventBus {
  events: any[];
}

// Generic type-safe test module interface
export interface TestModule<
  TCommandHandler = ICommandHandler,
  TRepository = Repository<AggregateRoot>,
> {
  eventBus: TestEventBus;
  commandHandler: TCommandHandler;
  repository: TRepository;
}

interface TestEventPublisherInterface extends IntegrationEventPublisher {
  events: any[];
}

export class TestEventPublisher implements TestEventPublisherInterface {
  public readonly events: any[] = [];

  constructor(private readonly shouldFail: boolean) {}

  async publish(topic: string, message: any): Promise<void> {
    if (this.shouldFail) throw new Error('error test');
    this.events.push(message);
  }

  async publishBatch(topic: string, messages: any[]): Promise<void> {
    if (this.shouldFail) throw new Error('error test');
    messages.forEach((msg) => this.publish(topic, msg));
  }
}

interface CreateCQRSTestingModuleOptions {
  commands?: { commandHandler: Type<ICommandHandler> };
  events?: {
    domainEventHandler?: Type<IEventHandler>;
    shouldDomainEventPublishFail: boolean;
  };
  repositories?: {
    name: string;
    repository: Type<Repository<AggregateRoot>>;
  };
}

export async function createTestingModule(
  options: CreateCQRSTestingModuleOptions,
) {
  const { commands, events, repositories } = options;
  const shouldFail = events?.shouldDomainEventPublishFail ?? false;

  const providers: Provider[] = [];

  if (commands?.commandHandler) providers.push(commands.commandHandler);

  if (events?.domainEventHandler) {
    providers.push(events.domainEventHandler, {
      provide: INTEGRATION_EVENT_PUBLISHER_TOKEN,
      useFactory: () => new TestEventPublisher(shouldFail),
    });
  }

  if (repositories) {
    providers.push({
      provide: repositories.name,
      useClass: repositories.repository,
    });
  }

  const moduleRef = await Test.createTestingModule({
    imports: [CqrsModule],
    providers,
  }).compile();

  await moduleRef.init();

  const commandHandler =
    commands?.commandHandler &&
    moduleRef.get<ICommandHandler>(commands.commandHandler);
  const eventHandler =
    events?.domainEventHandler &&
    moduleRef.get<IEventHandler>(events.domainEventHandler);
  const integrationEventPublisher =
    events?.domainEventHandler &&
    moduleRef.get<IntegrationEventPublisher>(INTEGRATION_EVENT_PUBLISHER_TOKEN);
  const repository =
    repositories && moduleRef.get<Repository<AggregateRoot>>(repositories.name);
  const eventBus = moduleRef.get(EventBus);

  const eventList: any[] = [];
  (eventBus as any).events = eventList;

  const originalPublish = eventBus.publish.bind(eventBus);
  const originalPublishAll = eventBus.publishAll.bind(eventBus);

  if (shouldFail) {
    eventBus.publish = () => {
      throw new Error('error test');
    };
    eventBus.publishAll = () => {
      throw new Error('error test');
    };
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
    integrationEventPublisher:
      integrationEventPublisher as TestEventPublisherInterface,
    repository,
  };
}
