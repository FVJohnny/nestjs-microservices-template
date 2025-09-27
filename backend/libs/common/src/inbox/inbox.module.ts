import { Global, Module } from '@nestjs/common';
import { InMemoryInboxRepository } from './repositories/in-memory-inbox.repository';
import { INBOX_REPOSITORY_TOKEN } from './inbox.constants';
import { InboxService } from './inbox.service';

@Global()
@Module({
  controllers: [],
  providers: [
    {
      provide: INBOX_REPOSITORY_TOKEN,
      useClass: InMemoryInboxRepository,
    },
    InboxService,
  ],
  exports: [InboxService],
})
export class InboxModule {}
