import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { MongoDBConfigService } from './mongodb-config.service';

@ApiTags('MongoDB')
@Controller('mongodb')
export class MongoDBController {
  constructor(private readonly configService: MongoDBConfigService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check MongoDB connection health' })
  @ApiResponse({ status: 200, description: 'MongoDB connection is healthy' })
  async getHealth() {
    const configResult = {
      host: this.configService.getConnectionString(),
      database: this.configService.getDatabaseName(),
    };
    return {
      status: 'healthy',
      config: configResult,
      uptime: process.uptime(),
    };
  }
}
