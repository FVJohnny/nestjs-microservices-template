import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RuntimeAutoDiscovery } from '@libs/nestjs-common';

// Infrastructure - Repositories
import { UserMongodbRepository } from './infrastructure/repositories/mongodb/user-mongodb.repository';
import { UserInMemoryRepository } from './infrastructure/repositories/in-memory/user-in-memory.repository';

// 🚀 RUNTIME AUTO-DISCOVERY - NO FILES NEEDED!
const {controllers, handlers} = RuntimeAutoDiscovery.discoverAllComponents(__dirname);

/**
 * Users module with PURE runtime auto-discovery
 * Just create handlers and controllers - they get discovered automatically!
 * NO decorators, NO imports, NO generated files needed!
 */
@Module({
  imports: [CqrsModule],
  controllers: [...controllers], // 🎯 Auto-discovered at runtime
  providers: [
    ...handlers, // 🎯 Auto-discovered at runtime
    {
      provide: 'UserRepository',
      useClass: UserMongodbRepository,
    },
  ],
})
export class UsersModule {}