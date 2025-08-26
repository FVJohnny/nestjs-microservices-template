import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedRedisModule } from '@libs/nestjs-redis';
import { SharedPostgreSQLModule, PostgreSQLConfigService } from '@libs/nestjs-postgresql';
import { SharedMongoDBModule } from '@libs/nestjs-mongodb';

/**
 * Global database module that provides MongoDB, Redis, and PostgreSQL connections
 */
@Global()
@Module({
  imports: [
    // Redis
    SharedRedisModule,

    // MongoDB
    SharedMongoDBModule,

    // PostgreSQL - Only needed for Channels bounded context
    SharedPostgreSQLModule,
    // Use the shared module's helper method with type assertion for now
    // This is a known issue with TypeORM version mismatches in monorepo setups
    // TypeOrmModule.forRootAsync(
    //   SharedPostgreSQLModule.getTypeOrmConfig([PostgreSQLChannelEntity]) as any,
    // ),
    
  ],
  providers: [
  ],
  exports: []
})
export class DatabaseModule {}
