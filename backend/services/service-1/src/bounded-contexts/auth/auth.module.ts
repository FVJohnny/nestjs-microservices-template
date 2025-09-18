import { Module } from '@nestjs/common';
import { RuntimeAutoDiscovery } from '@libs/nestjs-common';

// Infrastructure - Repositories
import { User_Mongodb_Repository } from './infrastructure/repositories/mongodb/user-mongodb.repository';
import { USER_REPOSITORY } from './domain/repositories/user/user.repository';
import { EmailVerification_Mongodb_Repository } from './infrastructure/repositories/mongodb/email-verification-mongodb.repository';
import { EMAIL_VERIFICATION_REPOSITORY } from './domain/repositories/email-verification/email-verification.repository';

// 🚀 RUNTIME AUTO-DISCOVERY
const { controllers, handlers } = RuntimeAutoDiscovery.discoverAllComponents(__dirname);

@Module({
  imports: [],
  controllers: [...controllers],
  providers: [
    ...handlers,
    {
      provide: USER_REPOSITORY,
      useClass: User_Mongodb_Repository,
    },
    {
      provide: EMAIL_VERIFICATION_REPOSITORY,
      useClass: EmailVerification_Mongodb_Repository,
    },
  ],
})
export class AuthBoundedContextModule {}
