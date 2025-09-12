import { Global, Module } from '@nestjs/common';
import type { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

import { PostgreSQLController } from './postgresql.controller';
import { PostgreSQLConfigService } from './postgresql-config.service';

@Global()
@Module({
  controllers: [PostgreSQLController],
  providers: [PostgreSQLConfigService],
  exports: [PostgreSQLConfigService],
})
export class PostgresDBModule {
  static getTypeOrmConfig(entities = []): TypeOrmModuleAsyncOptions {
    return {
      useFactory: (configService: PostgreSQLConfigService) => ({
        ...configService.getPostgreSQLConfig(),
        entities,
      }),
      inject: [PostgreSQLConfigService],
    };
  }
}
