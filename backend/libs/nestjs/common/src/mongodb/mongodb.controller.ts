import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MongoDBConfigService } from './mongodb-config.service';

@ApiTags('MongoDB')
@Controller('mongodb')
export class MongoDBController {
  constructor(private readonly mongoDBConfigService: MongoDBConfigService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get MongoDB configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  getConfig() {
    return this.mongoDBConfigService.getMongoConfig();
  }
}