import { Global, Module } from '@nestjs/common';
import { Inbox_InMemory_Repository } from './infrastructure/inbox.in-memory-repository';
import { INBOX_REPOSITORY_TOKEN } from './inbox.constants';
import { InboxService } from './inbox.service';

@Global()
@Module({
  controllers: [],
  providers: [
    {
      provide: INBOX_REPOSITORY_TOKEN,
      useClass: Inbox_InMemory_Repository,
    },
    InboxService,
  ],
  exports: [InboxService],
})
export class InboxModule {}
