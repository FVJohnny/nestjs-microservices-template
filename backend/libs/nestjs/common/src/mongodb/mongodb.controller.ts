import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MongoDBService } from './mongodb.service';

@ApiTags('MongoDB')
@Controller('mongodb')
export class MongoDBController {
  constructor(private readonly mongoDBService: MongoDBService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get MongoDB configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  getConfig() {
    return {
      uri: this.mongoDBService.getConnectionUri(),
      database: this.mongoDBService.getDatabaseName(),
      options: this.mongoDBService.getConnectionOptions(),
    };
  }
}