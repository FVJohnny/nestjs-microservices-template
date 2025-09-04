import { Global, Module } from '@nestjs/common';
import { SharedRedisModule } from '@libs/nestjs-redis';
import { SharedPostgreSQLModule } from '@libs/nestjs-postgresql';
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

    // PostgreSQL
    SharedPostgreSQLModule,
    // TypeOrmModule.forRootAsync(
    //   SharedPostgreSQLModule.getTypeOrmConfig([PostgreSQLChannelEntity]) as any,
    // ),
  ],
  providers: [],
  exports: [],
})
export class DatabaseModule {}
