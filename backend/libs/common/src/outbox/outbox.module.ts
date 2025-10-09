import { Module, DynamicModule, Global } from '@nestjs/common';
import { OutboxService, OUTBOX_REPOSITORY } from './outbox.service';
import { Outbox_Repository } from './domain/outbox.repository';
import { Outbox_InMemory_Repository } from './infrastructure/outbox.in-memory-repository';

export interface OutboxModuleOptions {
  repository?: new (...args: unknown[]) => Outbox_Repository;
}

@Module({})
@Global()
export class OutboxModule {
  static forRoot(options: OutboxModuleOptions = {}): DynamicModule {
    return {
      module: OutboxModule,
      providers: [
        OutboxService,
        { provide: OUTBOX_REPOSITORY, useClass: options.repository || Outbox_InMemory_Repository },
      ],
      exports: [OutboxService, OUTBOX_REPOSITORY],
    };
  }
}
