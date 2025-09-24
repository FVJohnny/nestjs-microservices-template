import { Module, DynamicModule, Global } from '@nestjs/common';
import { OutboxService, OUTBOX_REPOSITORY } from './outbox.service';
import { OutboxRepository } from './domain/outbox.repository';
import { InMemoryOutboxRepository } from './repositories/in-memory-outbox.repository';

export interface OutboxModuleOptions {
  repository?: new (...args: unknown[]) => OutboxRepository;
}

@Module({})
@Global()
export class OutboxModule {
  static forRoot(options: OutboxModuleOptions = {}): DynamicModule {
    return {
      module: OutboxModule,
      providers: [
        OutboxService,
        { provide: OUTBOX_REPOSITORY, useClass: options.repository || InMemoryOutboxRepository },
      ],
      exports: [OutboxService, OUTBOX_REPOSITORY],
    };
  }
}
