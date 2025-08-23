import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { PostgreSQLConfigService } from './postgresql-config.service';
import { PostgreSQLController } from './postgresql.controller';

@Global()
@Module({
  imports: [
  ],
  controllers: [PostgreSQLController],
  providers: [PostgreSQLConfigService],
  exports: [PostgreSQLConfigService],
})
export class SharedPostgreSQLModule {
  /**
   * Returns TypeORM configuration for use in application-level modules
   * This avoids the ModuleRef issues when TypeORM is created in shared libraries
   */
  static getTypeOrmConfig(entities: any[] = []): TypeOrmModuleAsyncOptions {
    return {
      useFactory: (configService: PostgreSQLConfigService) => ({
        ...configService.getPostgreSQLConfig(),
        entities,
      }),
      inject: [PostgreSQLConfigService],
    };
  }

}