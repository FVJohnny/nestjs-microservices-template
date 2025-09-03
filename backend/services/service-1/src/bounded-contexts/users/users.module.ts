import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RuntimeAutoDiscovery } from '@libs/nestjs-common';

// Infrastructure - Repositories
import { UserMongodbRepository } from './infrastructure/repositories/mongodb/user-mongodb.repository';
import { UserInMemoryRepository } from './infrastructure/repositories/in-memory/user-in-memory.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository';

// 🚀 RUNTIME AUTO-DISCOVERY
const { controllers, handlers } =
  RuntimeAutoDiscovery.discoverAllComponents(__dirname);

@Module({
  imports: [CqrsModule],
  controllers: [...controllers],
  providers: [
    ...handlers,
    {
      provide: USER_REPOSITORY,
      useClass: UserMongodbRepository,
    },
  ],
})
export class UsersModule {}
