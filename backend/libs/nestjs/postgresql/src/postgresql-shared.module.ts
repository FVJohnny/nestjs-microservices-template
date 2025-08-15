import { Module, Global, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgreSQLConfigService } from './postgresql-config.service';
import { PostgreSQLController } from './postgresql.controller';

@Global()
@Module({
  imports: [
    // TypeOrmModule.forRootAsync({
    //   useFactory: (configService: PostgreSQLConfigService) => 
    //     configService.getPostgreSQLConfig(),
    //   inject: [PostgreSQLConfigService],
    // }),
  ],
  controllers: [PostgreSQLController],
  providers: [PostgreSQLConfigService,
    
  ],
  exports: [PostgreSQLConfigService],
})
export class SharedPostgreSQLModule {
}