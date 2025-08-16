import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { RedisService } from './redis.service';

@ApiTags('Redis')
@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('health')
  @ApiOperation({ 
    summary: 'Check Redis connection health',
    description: 'Performs a ping to Redis and returns connection status' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis health check result',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        ping: { type: 'string', example: 'PONG' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getHealth() {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        return {
          status: 'unavailable',
          message: 'Redis client not initialized',
          timestamp: new Date().toISOString(),
        };
      }
      const ping = await client.ping();
      return {
        status: 'healthy',
        ping,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('info')
  @ApiOperation({ 
    summary: 'Get Redis server information',
    description: 'Returns detailed Redis server information including memory, clients, and performance metrics' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis server information',
    schema: {
      type: 'object',
      properties: {
        server: { type: 'object' },
        memory: { type: 'object' },
        clients: { type: 'object' },
        stats: { type: 'object' },
        keyspace: { type: 'object' },
      },
    },
  })
  async getInfo() {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not initialized');
      }
      const info = await client.info();
      
      // Parse info string into structured object
      const sections = info.split('\r\n\r\n').reduce((acc, section) => {
        const lines = section.split('\r\n');
        const sectionName = lines[0]?.replace('# ', '').toLowerCase();
        
        if (sectionName && lines.length > 1) {
          acc[sectionName] = lines.slice(1).reduce((sectionAcc, line) => {
            const [key, value] = line.split(':');
            if (key && value !== undefined) {
              sectionAcc[key] = isNaN(Number(value)) ? value : Number(value);
            }
            return sectionAcc;
          }, {} as Record<string, any>);
        }
        
        return acc;
      }, {} as Record<string, any>);

      return sections;
    } catch (error) {
      throw new Error(`Failed to get Redis info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get Redis usage statistics',
    description: 'Returns application-specific Redis usage statistics including key counts and memory usage' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis usage statistics',
    schema: {
      type: 'object',
      properties: {
        totalKeys: { type: 'number', example: 150 },
        keysByPattern: { type: 'object' },
        memoryUsage: { type: 'object' },
        uptime: { type: 'number', example: 86400 },
        connectedClients: { type: 'number', example: 5 },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getStats() {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not initialized');
      }
      
      // Get basic info
      const info = await client.info('memory');
      const serverInfo = await client.info('server');
      const clientsInfo = await client.info('clients');
      
      // Count keys by patterns
      const allKeys = await this.redisService.keys('*');
      const keyPatterns = {
        'channel:*': await this.redisService.keys('channel:*'),
        'user_channels:*': await this.redisService.keys('user_channels:*'),
        'other': [] as string[],
      };
      
      // Categorize keys
      allKeys.forEach(key => {
        if (key.startsWith('channel:')) {
          return; // Already counted
        } else if (key.startsWith('user_channels:')) {
          return; // Already counted
        } else {
          keyPatterns.other.push(key);
        }
      });

      // Parse memory info
      const memoryLines = info.split('\r\n');
      const memory = memoryLines.reduce((acc, line) => {
        const [key, value] = line.split(':');
        if (key && value !== undefined) {
          acc[key] = isNaN(Number(value)) ? value : Number(value);
        }
        return acc;
      }, {} as Record<string, any>);

      // Parse uptime
      const serverLines = serverInfo.split('\r\n');
      const uptime = serverLines.find(line => line.startsWith('uptime_in_seconds:'))
        ?.split(':')[1] || '0';

      // Parse clients
      const clientLines = clientsInfo.split('\r\n');
      const connectedClients = clientLines.find(line => line.startsWith('connected_clients:'))
        ?.split(':')[1] || '0';

      return {
        totalKeys: allKeys.length,
        keysByPattern: {
          'channel:*': keyPatterns['channel:*'].length,
          'user_channels:*': keyPatterns['user_channels:*'].length,
          'other': keyPatterns.other.length,
        },
        keyExamples: {
          'channel:*': keyPatterns['channel:*'].slice(0, 5),
          'user_channels:*': keyPatterns['user_channels:*'].slice(0, 5),
          'other': keyPatterns.other.slice(0, 5),
        },
        memoryUsage: {
          usedMemory: memory.used_memory,
          usedMemoryHuman: memory.used_memory_human,
          usedMemoryRss: memory.used_memory_rss,
          usedMemoryPeak: memory.used_memory_peak,
          usedMemoryPeakHuman: memory.used_memory_peak_human,
        },
        uptime: parseInt(uptime, 10),
        connectedClients: parseInt(connectedClients, 10),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get Redis stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Get('keys')
  @ApiOperation({ 
    summary: 'Get Redis keys by pattern',
    description: 'Returns keys matching the specified pattern (use with caution in production)' 
  })
  @ApiQuery({ 
    name: 'pattern', 
    description: 'Redis key pattern (e.g., "channel:*", "user_channels:*")',
    example: 'channel:*',
    required: false 
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Maximum number of keys to return',
    example: 10,
    required: false 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of Redis keys matching the pattern',
    schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', example: 'channel:*' },
        keys: { type: 'array', items: { type: 'string' } },
        count: { type: 'number', example: 5 },
        limited: { type: 'boolean', example: false },
      },
    },
  })
  async getKeys(
    @Query('pattern') pattern: string = '*',
    @Query('limit') limitStr?: string
  ) {
    try {
      const limit = limitStr ? parseInt(limitStr, 10) : undefined;
      const keys = await this.redisService.keys(pattern);
      
      const limitedKeys = limit ? keys.slice(0, limit) : keys;
      
      return {
        pattern,
        keys: limitedKeys,
        count: limitedKeys.length,
        totalCount: keys.length,
        limited: limit ? keys.length > limit : false,
      };
    } catch (error) {
      throw new Error(`Failed to get Redis keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Get('key/:key')
  @ApiOperation({ 
    summary: 'Get Redis key information',
    description: 'Returns information about a specific Redis key including type, TTL, and value' 
  })
  @ApiParam({ 
    name: 'key', 
    description: 'Redis key name',
    example: 'channel:123e4567-e89b-12d3-a456-426614174000' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis key information',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        exists: { type: 'boolean' },
        type: { type: 'string' },
        ttl: { type: 'number' },
        value: { type: 'any' },
        size: { type: 'number' },
      },
    },
  })
  async getKeyInfo(@Param('key') key: string) {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not initialized');
      }
      
      const exists = await this.redisService.exists(key);
      if (!exists) {
        return {
          key,
          exists: false,
          type: null,
          ttl: null,
          value: null,
          size: 0,
        };
      }

      const type = await client.type(key);
      const ttl = await client.ttl(key);
      
      let value: any = null;
      let size = 0;

      switch (type) {
        case 'string':
          value = await this.redisService.get(key);
          size = value ? value.length : 0;
          // Try to parse as JSON if possible
          try {
            value = JSON.parse(value || '');
          } catch {
            // Keep as string if not valid JSON
          }
          break;
        case 'hash':
          value = await this.redisService.hgetall(key);
          size = Object.keys(value).length;
          break;
        case 'set':
          value = await this.redisService.smembers(key);
          size = value.length;
          break;
        case 'list':
          const listLength = await client.llen(key);
          value = await client.lrange(key, 0, Math.min(listLength - 1, 99)); // Limit to first 100 items
          size = listLength;
          break;
        default:
          value = `Unsupported type: ${type}`;
      }

      return {
        key,
        exists: true,
        type,
        ttl: ttl === -1 ? null : ttl, // -1 means no expiration
        value,
        size,
      };
    } catch (error) {
      throw new Error(`Failed to get key info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}