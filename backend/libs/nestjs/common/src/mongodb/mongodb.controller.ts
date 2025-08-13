import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MongoDBService } from './mongodb.service';

@ApiTags('MongoDB')
@Controller('mongodb')
export class MongoDBController {
  constructor(private readonly mongoDBService: MongoDBService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get MongoDB connection status' })
  @ApiResponse({ status: 200, description: 'Connection status retrieved successfully' })
  getStatus() {
    return this.mongoDBService.getConnectionStatus();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check MongoDB health' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async checkHealth() {
    const isHealthy = this.mongoDBService.isHealthy();
    const pingResult = await this.mongoDBService.ping();
    
    return {
      healthy: isHealthy && pingResult,
      connection: this.mongoDBService.getConnectionStatus(),
      ping: pingResult,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get database statistics' })
  @ApiResponse({ status: 200, description: 'Database statistics retrieved' })
  async getStats() {
    try {
      const stats = await this.mongoDBService.getDbStats();
      return stats;
    } catch (error: any) {
      return {
        error: 'Failed to retrieve database statistics',
        message: error.message,
      };
    }
  }

  @Get('collections')
  @ApiOperation({ summary: 'List all collections in the database' })
  @ApiResponse({ status: 200, description: 'Collections list retrieved' })
  async listCollections() {
    try {
      const collections = await this.mongoDBService.listCollections();
      return {
        count: collections.length,
        collections,
      };
    } catch (error: any) {
      return {
        error: 'Failed to list collections',
        message: error.message,
      };
    }
  }
}