import { Module } from '@nestjs/common';
import { RuntimeAutoDiscovery } from '@libs/nestjs-common';

// Infrastructure - Repositories
import { User_Mongodb_Repository } from './infrastructure/repositories/mongodb/user-mongodb.repository';
import { USER_REPOSITORY } from './domain/repositories/user/user.repository';
import { EmailVerification_Mongodb_Repository } from './infrastructure/repositories/mongodb/email-verification-mongodb.repository';
import { EMAIL_VERIFICATION_REPOSITORY } from './domain/repositories/email-verification/email-verification.repository';
import { PasswordReset_Mongodb_Repository } from './infrastructure/repositories/mongodb/password-reset-mongodb.repository';
import { PASSWORD_RESET_REPOSITORY } from './domain/repositories/password-reset/password-reset.repository';
import { UserToken_Redis_Repository } from './infrastructure/repositories/redis/user-token-redis.repository';
import {
  USER_TOKEN_REPOSITORY,
  StoreTokens_CommandHandler,
  GetUserTokenByToken_QueryHandler,
} from '@libs/nestjs-common';

// 🚀 RUNTIME AUTO-DISCOVERY
const { controllers, handlers } = RuntimeAutoDiscovery.discoverAllComponents(__dirname);

@Module({
  controllers: [...controllers],
  providers: [
    ...handlers,
    StoreTokens_CommandHandler,
    GetUserTokenByToken_QueryHandler,
    {
      provide: USER_REPOSITORY,
      useClass: User_Mongodb_Repository,
    },
    {
      provide: EMAIL_VERIFICATION_REPOSITORY,
      useClass: EmailVerification_Mongodb_Repository,
    },
    {
      provide: PASSWORD_RESET_REPOSITORY,
      useClass: PasswordReset_Mongodb_Repository,
    },
    {
      provide: USER_TOKEN_REPOSITORY,
      useClass: UserToken_Redis_Repository,
    },
  ],
})
export class AuthBoundedContextModule {}
