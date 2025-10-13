import { Module } from '@nestjs/common';
import { RuntimeAutoDiscovery } from '@libs/nestjs-common';

// Infrastructure - Repositories
import { User_MongodbRepository } from './infrastructure/repositories/mongodb/user.mongodb-repository';
import { USER_REPOSITORY } from './domain/aggregates/user/user.repository';
import { EmailVerification_MongodbRepository } from './infrastructure/repositories/mongodb/email-verification.mongodb-repository';
import { EMAIL_VERIFICATION_REPOSITORY } from './domain/aggregates/email-verification/email-verification.repository';
import { PasswordReset_MongodbRepository } from './infrastructure/repositories/mongodb/password-reset.mongodb-repository';
import { PASSWORD_RESET_REPOSITORY } from './domain/aggregates/password-reset/password-reset.repository';
import { UserToken_RedisRepository } from '@libs/nestjs-redis';
import {
  USER_TOKEN_REPOSITORY,
  StoreTokens_CommandHandler,
  GetUserTokenByToken_QueryHandler,
} from '@libs/nestjs-common';

// Domain Services
import { UserUniquenessChecker } from './domain/services/user-uniqueness-checker.service';
import { USER_UNIQUENESS_CHECKER } from './domain/services/user-uniqueness-checker.interface';

// 🚀 RUNTIME AUTO-DISCOVERY
const { controllers, handlers } = RuntimeAutoDiscovery.discoverAllComponents(__dirname);

@Module({
  controllers: [...controllers],
  providers: [
    ...handlers,
    StoreTokens_CommandHandler,
    GetUserTokenByToken_QueryHandler,
    // Repositories (Secondary Ports)
    {
      provide: USER_REPOSITORY,
      useClass: User_MongodbRepository,
    },
    {
      provide: EMAIL_VERIFICATION_REPOSITORY,
      useClass: EmailVerification_MongodbRepository,
    },
    {
      provide: PASSWORD_RESET_REPOSITORY,
      useClass: PasswordReset_MongodbRepository,
    },
    {
      provide: USER_TOKEN_REPOSITORY,
      useClass: UserToken_RedisRepository,
    },
    // Domain Services
    {
      provide: USER_UNIQUENESS_CHECKER,
      useClass: UserUniquenessChecker,
    },
  ],
})
export class AuthBoundedContextModule {}
