import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { RuntimeAutoDiscovery } from '@libs/nestjs-common';

// Infrastructure - Repositories
import { UserMongodbRepository } from './infrastructure/repositories/mongodb/user-mongodb.repository';
import { USER_REPOSITORY } from './domain/repositories/user/user.repository';
import { EmailVerificationMongodbRepository } from './infrastructure/repositories/mongodb/email-verification-mongodb.repository';
import { EMAIL_VERIFICATION_REPOSITORY } from './domain/repositories/email-verification/email-verification.repository';

// 🚀 RUNTIME AUTO-DISCOVERY
const { controllers, handlers } = RuntimeAutoDiscovery.discoverAllComponents(__dirname);

@Module({
  imports: [
    CqrsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
    }),
  ],
  controllers: [...controllers],
  providers: [
    ...handlers,
    {
      provide: USER_REPOSITORY,
      useClass: UserMongodbRepository,
    },
    {
      provide: EMAIL_VERIFICATION_REPOSITORY,
      useClass: EmailVerificationMongodbRepository,
    },
  ],
})
export class AuthModule {}
