import { RuntimeAutoDiscovery } from '@libs/nestjs-common';
import { Module } from '@nestjs/common';
import { EMAIL_SERVICE } from './domain/services/email.service';
import { Email_SmtpService } from './infrastructure/services/email.smtp-service';

// 🚀 RUNTIME AUTO-DISCOVERY
const { controllers, handlers } = RuntimeAutoDiscovery.discoverAllComponents(__dirname);

@Module({
  controllers: [...controllers],
  providers: [
    ...handlers,
    {
      provide: EMAIL_SERVICE,
      useClass: Email_SmtpService,
    },
  ],
})
export class NotificationsBoundedContextModule {}
