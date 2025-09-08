import { Module, DynamicModule, Global, Provider } from "@nestjs/common";
import { OutboxService, OUTBOX_REPOSITORY_TOKEN } from "./outbox.service";
import { OutboxRepository } from "./outbox.repository";
import { InMemoryOutboxRepository } from "./repositories/in-memory-outbox.repository";

export interface OutboxModuleOptions {
  repository?: new (...args: unknown[]) => OutboxRepository;
  repositoryProvider?: Provider;
}

@Module({})
@Global()
export class OutboxModule {
  static forRoot(options: OutboxModuleOptions = {}): DynamicModule {
    const repositoryProvider = options.repositoryProvider || {
      provide: OUTBOX_REPOSITORY_TOKEN,
      useClass: options.repository || InMemoryOutboxRepository,
    };

    return {
      module: OutboxModule,
      providers: [OutboxService, repositoryProvider],
      exports: [OutboxService, OUTBOX_REPOSITORY_TOKEN],
    };
  }
}
