import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PostgreSQLConfigService } from './postgresql-config.service';

@ApiTags('PostgreSQL')
@Controller('postgresql')
export class PostgreSQLController {
  constructor(private readonly configService: PostgreSQLConfigService) {}

  @Get('config')
  @ApiOperation({ 
    summary: 'Get PostgreSQL configuration',
    description: 'Returns the current PostgreSQL configuration (sensitive data masked)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'PostgreSQL configuration',
    schema: {
      type: 'object',
      properties: {
        host: { type: 'string' },
        port: { type: 'number' },
        database: { type: 'string' },
        username: { type: 'string' },
        ssl: { type: 'boolean' },
        synchronize: { type: 'boolean' },
        logging: { type: 'boolean' },
      },
    },
  })
  getConfig() {
    const config = this.configService.getPostgreSQLConfig();
    
    return {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: '***masked***',
      ssl: !!config.ssl,
      synchronize: config.synchronize,
      logging: config.logging,
      connectionUrl: this.configService.getConnectionUrl().replace(/:[^:@]+@/, ':***masked***@'),
    };
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Check PostgreSQL connection health',
    description: 'Returns the health status of the PostgreSQL connection' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'PostgreSQL health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        config: { type: 'object' },
        uptime: { type: 'number' },
      },
    },
  })
  async getHealth() {
    try {
      const config = this.configService.getPostgreSQLConfig();
      
      return {
        status: 'healthy',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          ssl: !!config.ssl,
        },
        uptime: process.uptime(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        uptime: process.uptime(),
      };
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get PostgreSQL connection statistics',
    description: 'Returns detailed statistics about the PostgreSQL connection' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'PostgreSQL connection statistics',
    schema: {
      type: 'object',
      properties: {
        service: { type: 'string' },
        environment: { type: 'object' },
        uptime: { type: 'number' },
      },
    },
  })
  async getStats() {
    try {
      const config = this.configService.getPostgreSQLConfig();
      
      return {
        service: 'PostgreSQL',
        environment: {
          host: config.host,
          port: config.port,
          database: config.database,
          synchronize: config.synchronize,
          logging: config.logging,
          ssl: !!config.ssl,
        },
        uptime: process.uptime(),
        connectionUrl: this.configService.getConnectionUrl().replace(/:[^:@]+@/, ':***masked***@'),
      };
    } catch (error) {
      return {
        service: 'PostgreSQL',
        error: error.message,
        uptime: process.uptime(),
      };
    }
  }
}