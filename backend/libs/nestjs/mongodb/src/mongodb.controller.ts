import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse,ApiTags } from '@nestjs/swagger';

import { MongoClient } from 'mongodb';
import { Inject } from '@nestjs/common';
import { MONGO_CLIENT_TOKEN } from './mongodb.module';
import { MongoDBConfigService } from './mongodb-config.service';

@ApiTags('MongoDB')
@Controller('mongodb')
export class MongoDBController {
  constructor(
    @Inject(MONGO_CLIENT_TOKEN)
    private readonly mongoClient: MongoClient,
    private readonly configService: MongoDBConfigService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check MongoDB connection health' })
  @ApiResponse({ status: 200, description: 'MongoDB connection is healthy' })
  async getHealth() {
    const db = this.mongoClient.db();
    const pingResult = await db.command({ ping: 1 });

    const configResult = {
      host: this.configService.getConnectionString(),
      database: this.configService.getDatabaseName(),
    };
    if (pingResult.ok === 1) {
      return {
        status: 'healthy',
        config: configResult,
        uptime: process.uptime(),
      };
    } else {
      return {
        status: 'unhealthy',
        config: configResult,
        uptime: process.uptime(),
      };
    }
  }
}